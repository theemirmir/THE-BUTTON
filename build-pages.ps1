$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$shell = Get-Content -Raw -Encoding UTF8 "$root\shell.html"
$css = Get-Content -Raw -Encoding UTF8 "$root\style.css"
$audio = Get-Content -Raw -Encoding UTF8 "$root\audio.js"
$main = Get-Content -Raw -Encoding UTF8 "$root\main.js"
$three = Get-Content -Raw -Encoding UTF8 "$root\vendor\three.min.js"

if ($shell -notmatch 'id="title-screen"' -or $shell -notmatch '<canvas id="scene">') {
  throw "shell.html is missing required markup"
}

$styleBlock = "<style>`r`n$css`r`n  </style>"
$scripts = @"
  <!-- Three.js r160 UMD — inlined so GitHub Pages needs no CDN -->
  <script>
$three
  </script>
  <script>
$audio
  </script>
  <script>
$main
  </script>
  <script>
    (function () {
      if (typeof THREE === "undefined") {
        var hint = document.getElementById("enter-hint");
        if (hint) hint.textContent = "FAILED TO LOAD 3D ENGINE";
        document.body.classList.remove("is-resuming", "is-playing", "is-entering");
        document.body.classList.add("is-title");
        var title = document.getElementById("title-screen");
        if (title) title.classList.remove("is-gone");
      }
    })();
  </script>
"@

$out = $shell.Replace("<!--INLINE_STYLE-->", $styleBlock).Replace("<!--INLINE_SCRIPTS-->", $scripts)
if ($out -notmatch 'id="title-screen"' -or $out -notmatch '<canvas id="scene">' -or $out -notmatch 'WebGLRenderer') {
  throw "build validation failed"
}

[System.IO.File]::WriteAllText("$root\index.html", $out, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText("$root\.nojekyll", "", [System.Text.UTF8Encoding]::new($false))
Write-Host "Built index.html bytes:" ((Get-Item "$root\index.html").Length)
Write-Host "OK title-screen + canvas + THREE present"
