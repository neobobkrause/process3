# Bob's act 4: two workflow changes for the copy's first tranche close (4 Nov 07:00)

The first close of neobobkrause/civicsmith-copy (tranche into main) is refused by the merge tool until these two diffs reach main. They are workflow changes, so only Bob can approve them. Route, recommended: commit them to the copy's main through GitHub's website, after which the close merges through the tool. The alternative is for Bob to merge the first close himself.

Note: container-images.yml publishes to GHCR and Docker Hub. The first diff adds a new published image, reader-container.

Commits on the tranche: container-images.yml fd9fe9a0ac (K5646, reader-container's matrix row), carried in 740d8f562f; regression.yml 7bd724f2f5 (ONB-6, the site's browser test).

```diff
diff --git a/.github/workflows/container-images.yml b/.github/workflows/container-images.yml
--- a/.github/workflows/container-images.yml
+++ b/.github/workflows/container-images.yml
@@ -15,6 +15,8 @@ on:
     paths: ["agent-runner/Dockerfile", "agent-runner/package.json", "agent-runner/package-lock.json", "agent-runner/src/**",
             "file-scanner/Dockerfile.*", "file-scanner/package.json", "file-scanner/package-lock.json",
             "file-scanner/packages-*.json", "file-scanner/container/**", "file-scanner/src/**",
+            "reader-container/Dockerfile", "reader-container/package.json", "reader-container/package-lock.json",
+            "reader-container/packages.json", "reader-container/container/**", "reader-container/src/**",
             ".github/workflows/container-images.yml"]
   workflow_dispatch:
 
@@ -33,6 +35,7 @@ jobs:
           - { name: agent-runner, context: agent-runner, file: agent-runner/Dockerfile, member: agent-runner }
           - { name: file-scanner-scanner, context: file-scanner, file: file-scanner/Dockerfile.scanner, member: file-scanner }
           - { name: file-scanner-renderer, context: file-scanner, file: file-scanner/Dockerfile.renderer, member: file-scanner }
+          - { name: reader-container, context: reader-container, file: reader-container/Dockerfile, member: reader-container }
     steps:
       - uses: actions/checkout@v4
       - uses: docker/setup-buildx-action@v3
diff --git a/.github/workflows/regression.yml b/.github/workflows/regression.yml
--- a/.github/workflows/regression.yml
+++ b/.github/workflows/regression.yml
@@ -31,7 +31,8 @@ jobs:
         timeout-minutes: 30
         run: |
           set -euo pipefail
-          for pkg in bio-plane pdf-worker ocr-worker newgroup agent-runner sheet-worker; do
+          # site: its browser test imports playwright-core from its own lock (ONB-6).
+          for pkg in bio-plane pdf-worker ocr-worker newgroup agent-runner sheet-worker site; do
             [ -f "$pkg/package-lock.json" ] || continue
             (cd "$pkg" && npm ci --no-audit --no-fund --loglevel=error)
           done
@@ -44,6 +45,10 @@ jobs:
         run: |
           set -uo pipefail
           failed=""
+          # site's browser test launches $CHROMIUM (default /opt/pw-browsers/chromium, absent on the runner):
+          # the Chromium journey-check's step installed, same playwright-core 1.56.1 (ONB-6).
+          CHROMIUM="$(ls -d "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux*/chrome 2>/dev/null | head -1)"
+          [ -n "$CHROMIUM" ] && export CHROMIUM || echo "::warning::no installed Chromium found; site's browser test will fail by name"
           for pkg in bio-plane pdf-worker ocr-worker newgroup agent-worker; do
             [ -f "$pkg/package.json" ] || continue
             echo "::group::$pkg"
```
