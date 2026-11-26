# Parallel canonical release validation

The 46 policy gates (45 blockers and one visual inventory advisory) formerly ran sequentially. The same policy and test commands now run in eight isolated browser jobs after a single static/build job. Route crawling and screenshot comparisons each retain the full canonical suite (190 routes / 255 screenshots); no screenshot baseline, timeout, or product assertion changes.

The existing release-candidate check aggregates all nine partition reports and evidence. It rejects missing or duplicate gates/partitions, wrong commit/run/policy/build fingerprints, changed or missing required evidence, failed blocker gates, and infrastructure failures. Matrix fail-fast is disabled to retain failure evidence. All original semantic checks and Item 13.17 sign-off remain mandatory. Pages deploys the same tested production build, after aggregate sign-off. The ordinary local npm run test:rc retains the sequential reference path.

Each job has its own browser and local HTTP server, avoiding shared Chromium and filesystem contention. The tradeoff is higher runner concurrency and artifact transfer overhead; measure real wall time before claiming a speedup. The screenshot suite remains intact on a dedicated runner to avoid introducing cross-host raster changes through viewport-level sharding. Consider viewport sharding only if measured critical-path timing warrants it.

Manual physical-device/PWA review remains unchanged.
