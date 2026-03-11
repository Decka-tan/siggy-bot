$OutputDir = ".\public\audio"
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$Voices = @{
    "anime_eto" = "えと"       # eto
    "anime_hmm" = "うーん"     # uun (hmm)
    "anime_hai" = "はい"       # hai
    "anime_ohayo" = "おはよう" # ohayou
    "anime_ara" = "あら"       # ara
    "cat_meow_real" = "ニャー" # nyaa
}

foreach ($Key in $Voices.Keys) {
    $Text = $Voices[$Key]
    $Url = "http://translate.google.com/translate_tts?ie=UTF-8&q=$([uri]::EscapeDataString($Text))&tl=ja&client=tw-ob"
    $OutFile = "$OutputDir\$Key.mp3"
    
    Write-Host "Fetching $Key -> $Text"
    Invoke-WebRequest -Uri $Url -OutFile $OutFile
    Start-Sleep -Milliseconds 500
}

Write-Host "Done downloading MP3 voices."
