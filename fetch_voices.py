import os
import urllib.request
import urllib.parse
import time

def ensure_dir(d):
    os.makedirs(d, exist_ok=True)

out_dir = "public/audio"
ensure_dir(out_dir)

voices = {
    "anime_eto": "えと",        # eto
    "anime_hmm": "うーん",      # uun (hmm)
    "anime_hai": "はい",        # hai
    "anime_ohayo": "おはよう",  # ohayou
    "anime_ara": "あらあら",      # ara ara
    "cat_meow_real": "にゃん"    # nyan
}

for key, text in voices.items():
    encoded_text = urllib.parse.quote(text)
    url = f"http://translate.google.com/translate_tts?ie=UTF-8&q={encoded_text}&tl=ja&client=tw-ob"
    out_file = os.path.join(out_dir, f"{key}.mp3")
    
    print(f"Fetching {key} -> {text}")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response, open(out_file, 'wb') as out:
            out.write(response.read())
        print(f"Saved {out_file}")
    except Exception as e:
        print(f"Error fetching {key}: {e}")
    time.sleep(0.5)

print("Done downloading voices.")
