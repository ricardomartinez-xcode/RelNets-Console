# ReLead-App Console status

## Canonical architecture
- Public web: `https://relead.com.mx`
- Authenticated human Console: `https://console.relead.com.mx`
- Backend/API: `https://api.relead.com.mx`

This repository is not authorized to change DNS, Cloudflare routing, Vercel, backend runtime or production as part of the RelNet Next Console UI task.

## RelNet Next Console
`/console/relnet` and its UI subroutes are implemented locally in this Worker as a fail-closed authenticated Console surface. They consume no networking logic and do not fabricate backend success.

The authoritative backend contract baseline for this UI is `6838b2fa375a36a5a2806acc842f115bb69f2061`. Where no product endpoint exists in that baseline, the UI exposes a typed dependency contract, renders the value as unavailable, and keeps mutating controls disabled.

Legacy graphical compatibility routing outside `/console/relnet*` remains unchanged by this workstream.
