#![no_std]

static MESSAGE: &str = r#"(env, ptr, len) => {
    const bytes = new Uint8Array(env.wasm.memory.buffer, ptr, len);
    switch (bytes[0]) {
        case 0: env.arguments(); break;
        case 1: env.operation = env.agent(); break;
        case 2: env.operation = env.serve(); break;
        case 3: throw Error('Usage: backend.js agent | backend.js -- command [args...]');
        case 4: env.output = bytes.slice(1); break;
        case 5: env.response = env.exchange(); break;
        default: throw Error('Unknown guest message');
    }
}"#;

// All I/O is supplied by the host. The guest asks for argv and selects the mode.
static START: &str = r#"async (env) => {
    let guest;
    const { instance } = await WebAssembly.instantiate(
        await Deno.readFile(new URL('dist/backend-guest.wasm', env.root)),
        { host: { msg(ptr, len) {
            const bytes = new Uint8Array(guest.memory.buffer, ptr >>> 0, len >>> 0);
            const copy = env.wasm.alloc(bytes.length) >>> 0;
            try {
                new Uint8Array(env.wasm.memory.buffer, copy, bytes.length).set(bytes);
                env.wasm.onmsg(copy, bytes.length);
            } finally {
                env.wasm.free(copy, bytes.length);
            }
        } } },
    );
    guest = instance.exports;
    env.arguments = () => {
        const args = Deno.args.map(arg => new TextEncoder().encode(arg));
        const bytes = new Uint8Array(4 + args.reduce((n, arg) => n + 4 + arg.length, 0));
        const view = new DataView(bytes.buffer);
        view.setUint32(0, args.length, true);
        let pos = 4;
        for (const arg of args) {
            view.setUint32(pos, arg.length, true);
            bytes.set(arg, pos + 4);
            pos += 4 + arg.length;
        }
        const ptr = guest.alloc(bytes.length) >>> 0;
        new Uint8Array(guest.memory.buffer, ptr, bytes.length).set(bytes);
        try { guest.arguments(ptr, bytes.length); }
        finally { guest.free(ptr, bytes.length); }
    };

    // One-byte requests; replies have a u32 little-endian length and raw bytes.
    // This deliberately small protocol only requests the placeholder page.
    env.agent = async () => {
        const writer = Deno.stdout.writable.getWriter();
        try {
            for await (const chunk of Deno.stdin.readable) {
                for (const byte of chunk) {
                    env.output = undefined;
                    guest.input(byte);
                    const header = new Uint8Array(4);
                    new DataView(header.buffer).setUint32(0, env.output.length, true);
                    await writer.write(header);
                    await writer.write(env.output);
                }
            }
        } finally {
            writer.releaseLock();
        }
    };

    env.serve = async () => {
        const [command, ...args] = Deno.args.slice(1);
        const child = new Deno.Command(command, {
            args, stdin: 'piped', stdout: 'piped', stderr: 'inherit',
        }).spawn();
        const writer = child.stdin.getWriter();
        const reader = child.stdout.getReader();
        let chunk = new Uint8Array(), offset = 0;
        async function read(length) {
            const bytes = new Uint8Array(length);
            for (let pos = 0; pos < length;) {
                if (offset === chunk.length) {
                    const next = await reader.read();
                    if (next.done) throw Error('Canvas agent closed stdout');
                    chunk = next.value;
                    offset = 0;
                }
                const n = Math.min(length - pos, chunk.length - offset);
                bytes.set(chunk.subarray(offset, offset + n), pos);
                offset += n;
                pos += n;
            }
            return bytes;
        }
        env.exchange = async () => {
            await writer.write(new Uint8Array([0]));
            const header = await read(4);
            const length = new DataView(header.buffer).getUint32(0, true);
            if (length > 1024 * 1024) throw Error('Agent reply exceeds scaffold limit');
            return await read(length);
        };
        const assets = new Map([
            ['/frontend.js', ['frontend.js', 'text/javascript']],
            ['/frontend-host.wasm', ['dist/frontend-host.wasm', 'application/wasm']],
            ['/frontend-guest.wasm', ['dist/frontend-guest.wasm', 'application/wasm']],
        ]);
        let busy = false, failed = false;
        const server = Deno.serve({ hostname: '127.0.0.1', port: 8788 }, async request => {
            if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
            const path = new URL(request.url).pathname;
            const headers = { 'Cache-Control': 'no-store, no-transform' };
            if (path === '/') {
                if (busy || failed) return new Response('Canvas agent unavailable', { status: 503 });
                busy = true;
                let timeout;
                try {
                    guest.request();
                    const page = await Promise.race([
                        env.response,
                        new Promise((_, reject) => {
                            timeout = setTimeout(() => reject(Error('Canvas agent timed out')), 10000);
                        }),
                    ]);
                    return new Response(page, {
                        headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
                    });
                } catch (error) {
                    failed = true;
                    console.error(error.message);
                    try { child.kill('SIGTERM'); } catch {}
                    return new Response('Canvas agent unavailable', { status: 502 });
                } finally {
                    clearTimeout(timeout);
                    busy = false;
                }
            }
            const asset = assets.get(path);
            if (!asset) return new Response('Not found', { status: 404 });
            return new Response(await Deno.readFile(new URL(asset[0], env.root)), {
                headers: { ...headers, 'Content-Type': asset[1] },
            });
        });
        const stop = () => {
            // End this exec session, not any container or VM that it entered.
            writer.close().catch(() => {});
            server.shutdown();
        };
        Deno.addSignalListener('SIGINT', stop);
        Deno.addSignalListener('SIGTERM', stop);
        child.status.then(status => {
            failed = true;
            console.error('Canvas agent exited:', status.code);
        });
        try { await server.finished; }
        finally {
            try { child.kill('SIGTERM'); } catch {}
            await child.status;
            Deno.removeSignalListener('SIGINT', stop);
            Deno.removeSignalListener('SIGTERM', stop);
        }
    };
    guest.run();
    await env.operation;
}"#;

#[link(wasm_import_module = "runner")]
extern "C" {
    fn compile(ptr: *const u8, len: usize) -> u32;
    fn call(reference: u32, ptr: *const u8, len: usize) -> u32;
}

static mut MESSAGE_REF: u32 = 0;

#[no_mangle]
pub extern "C" fn start() -> u32 {
    unsafe {
        MESSAGE_REF = compile(MESSAGE.as_ptr(), MESSAGE.len());
        let startup = compile(START.as_ptr(), START.len());
        call(startup, core::ptr::null(), 0)
    }
}

#[no_mangle]
pub extern "C" fn onmsg(ptr: *const u8, len: usize) {
    unsafe {
        call(MESSAGE_REF, ptr, len);
    }
}

// Byte-only arena: no alignment promise for typed allocations or GlobalAlloc.
// Bump allocation only; free is a no-op until a reuse policy is needed.
extern "C" {
    static __heap_base: u8;
}
static mut NEXT: usize = 0;

#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    unsafe {
        if NEXT == 0 {
            NEXT = core::ptr::addr_of!(__heap_base) as usize;
        }
        let ptr = NEXT;
        let end = ptr.checked_add(len).expect("allocation overflow");
        let pages = (end as u64 + 65535) / 65536;
        let current = core::arch::wasm32::memory_size::<0>() as u64;
        if pages > current {
            assert!(
                core::arch::wasm32::memory_grow::<0>((pages - current) as usize) != usize::MAX,
                "memory exhausted"
            );
        }
        NEXT = end;
        ptr as *mut u8
    }
}

#[no_mangle]
pub extern "C" fn free(_ptr: *mut u8, _len: usize) {}

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}
