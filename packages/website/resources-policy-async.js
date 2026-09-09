// The SQL policy needs a growable heap for project snapshots. Run the same
// policy in the existing QuickJS server runtime; only the device handoff
// changes. The controller serializes requests, including their continuations.
const beginPolicy = serverHandle;
serverHandle = async function (input) {
  let result = beginPolicy(input);
  while (Array.isArray(result) && result[0] === 2) {
    let value;
    try {
      value = await hostCall(result[1], result[2], result[3]);
    } catch (error) {
      result = serverResume(false, String(error));
      continue;
    }
    result = serverResume(true, value);
  }
  return result;
};
