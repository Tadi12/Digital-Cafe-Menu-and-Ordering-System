Add-Type -AssemblyName System.Drawing

# Mirrors client/src/config/qrCard.js + client/src/utils/qrCardImage.js
$root = 'C:\Users\tadim\Desktop\digital cafe menu'
$template = Join-Path $root 'client\public\qr-card-template.png'
$logo     = Join-Path $root 'client\public\logo.png'
$outDir   = Join-Path $root 'tools\out'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$PANEL = @{ x = 300; y = 480; size = 440; fill = '#FAF7F2' }
$NUM   = @{ cx = 150; cy = 672; maxWidth = 250; size = 50; color = '#CCCCCC' }
$NAME  = @{ cx = 150; cy = 720; maxWidth = 250; size = 18; color = '#C8C8C8' }
$SEAL  = @{ cx = 894; cy = 659; size = 150 }

$cases = @(
  @{ num = 1;  name = 'VIP Corner Table 1'; qr = 'qr-1.png';  file = 'card-1.png' },
  @{ num = 42; name = 'A Very Long Garden Terrace Table Name 42'; qr = 'qr-42.png'; file = 'card-42.png' }
)

$serif = 'Georgia'

function Fit-Font($text, $maxWidth, $startSize) {
  $size = $startSize
  $tmp = New-Object System.Drawing.Bitmap 1,1
  $gg = [System.Drawing.Graphics]::FromImage($tmp)
  while ($size -gt 10) {
    $f = New-Object System.Drawing.Font($serif, $size, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $w = $gg.MeasureString($text, $f).Width
    $f.Dispose()
    if ($w -le $maxWidth) { break }
    $size -= 1
  }
  $gg.Dispose(); $tmp.Dispose()
  return $size
}

$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = [System.Drawing.StringAlignment]::Center
$fmt.LineAlignment = [System.Drawing.StringAlignment]::Center

foreach ($c in $cases) {
  $tpl = [System.Drawing.Image]::FromFile($template)
  $bmp = New-Object System.Drawing.Bitmap 1080, 1440
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.DrawImage($tpl, 0, 0, 1080, 1440)

  $pb = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($PANEL.fill))
  $g.FillRectangle($pb, $PANEL.x, $PANEL.y, $PANEL.size, $PANEL.size)
  # Paste the QR at its NATIVE size, centred - never rescale it.
  # Matches client/src/utils/qrCardImage.js: the server renders whole-pixel
  # modules, so a fractional rescale would mix 8px and 9px modules.
  $qr = [System.Drawing.Image]::FromFile((Join-Path $outDir $c.qr))
  $qrSize = [Math]::Min($qr.Width, $PANEL.size)
  $qrOff  = [int][Math]::Round(($PANEL.size - $qrSize) / 2)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  Write-Host ("table {0}: qr {1}x{2} -> centred in {3}x{3} panel at ({4},{5}), {6}px cream margin/side" -f `
    $c.num, $qr.Width, $qr.Height, $PANEL.size, ($PANEL.x + $qrOff), ($PANEL.y + $qrOff), $qrOff)
  $g.DrawImage($qr, ($PANEL.x + $qrOff), ($PANEL.y + $qrOff), $qrSize, $qrSize)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $pb.Dispose()

  $label = "T - $($c.num)"
  $sz = Fit-Font $label $NUM.maxWidth $NUM.size
  $font = New-Object System.Drawing.Font($serif, $sz, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $br = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($NUM.color))
  $rect = New-Object System.Drawing.RectangleF (($NUM.cx - $NUM.maxWidth/2), ($NUM.cy - 40), $NUM.maxWidth, 80)
  $g.DrawString($label, $font, $br, $rect, $fmt)
  Write-Host ("  '{0}' @ {1}px" -f $label, $sz)

  if ($c.name) {
    $sz2 = Fit-Font $c.name $NAME.maxWidth $NAME.size
    $font2 = New-Object System.Drawing.Font($serif, $sz2, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $br2 = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($NAME.color))
    $rect2 = New-Object System.Drawing.RectangleF (($NAME.cx - $NAME.maxWidth/2), ($NAME.cy - 24), $NAME.maxWidth, 48)
    $g.DrawString($c.name, $font2, $br2, $rect2, $fmt)
    Write-Host ("  caption '{0}' @ {1}px" -f $c.name, $sz2)
    $font2.Dispose(); $br2.Dispose()
  }

  if (Test-Path $logo) {
    $lg = [System.Drawing.Image]::FromFile($logo)
    $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
    $clip.AddEllipse(($SEAL.cx - $SEAL.size/2), ($SEAL.cy - $SEAL.size/2), $SEAL.size, $SEAL.size)
    $g.SetClip($clip)
    $g.DrawImage($lg, ($SEAL.cx - $SEAL.size/2), ($SEAL.cy - $SEAL.size/2), $SEAL.size, $SEAL.size)
    $g.ResetClip()
    $clip.Dispose(); $lg.Dispose()
  }

  $dest = Join-Path $outDir $c.file
  $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
  $font.Dispose(); $br.Dispose()
  $g.Dispose(); $bmp.Dispose(); $tpl.Dispose(); $qr.Dispose()
  Write-Host "  saved $dest"
}
Write-Host "done: $($cases.Count) card(s) rendered."

