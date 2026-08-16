# Bootstrap example

This example exercises QuickJS-NG through the container message ABI. It uses
modern syntax and reports `QuickJS-NG:42` without adding ambient host powers.

The probe currently lives in `../../src/guest.c` while the reusable guest
runtime boundary is being extracted. Its application source will move here
when source loading replaces the bootstrap literal.
