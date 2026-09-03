import fcntl
import os
import select
import struct
import sys
import termios

shell = sys.argv[1] if len(sys.argv) > 1 else "/bin/bash"
pid, master = os.forkpty()
if pid == 0:
    os.execl(shell, shell, "-l")

fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack("HHHH", 40, 120, 0, 0))
while True:
    try:
        readable, _, _ = select.select([sys.stdin.fileno(), master], [], [])
        if master in readable:
            data = os.read(master, 65536)
            if not data:
                break
            os.write(sys.stdout.fileno(), data)
        if sys.stdin.fileno() in readable:
            data = os.read(sys.stdin.fileno(), 65536)
            if not data:
                break
            os.write(master, data)
    except OSError:
        break

try:
    os.kill(pid, 15)
except ProcessLookupError:
    pass
