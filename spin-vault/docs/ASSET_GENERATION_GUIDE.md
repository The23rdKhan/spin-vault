# Spin Vault - Asset Generation Guide

Complete guide for generating all missing assets using AI tools.

---

## 📱 App Icons (Priority: HIGH)

### Specifications
- **iOS:** 1024×1024 PNG, no transparency
- **Android:** 512×512 PNG

### AI Image Generation Prompts

#### Option 1: Classic Casino Vault Theme
```
A premium app icon for a mobile casino game. Golden vault door with
a spinning combination lock showing "777". Purple and gold gradient
background. Coin symbols and sparkles around the edges. Luxurious,
modern, flat design. High contrast. Perfect square composition.
4K quality. --ar 1:1 --style raw --v 6
```

#### Option 2: Modern Slot Machine Theme
```
Modern mobile app icon featuring a stylized 3D slot machine.
Golden reels showing lucky 7s. Purple and dark navy gradient
background. Glowing neon accents. Coins and gems floating.
Clean, premium, contemporary design. Centered composition.
Ultra HD. --ar 1:1 --style raw --v 6
```

#### Option 3: Minimalist Vault Logo
```
Minimalist app icon design. Circular gold vault door icon on
gradient purple-to-dark-blue background. Simple geometric shapes.
Subtle shine and depth. Modern, clean, professional. Perfect for
mobile app store. 1024x1024 pixels. --ar 1:1 --style raw --v 6
```

#### Option 4: Coin Stack Theme
```
Premium casino app icon showing a stack of golden coins with
sparkle effects. Purple velvet background with subtle texture.
Central coin showing "SV" monogram. Elegant, luxurious style.
Soft shadows and highlights. Mobile app icon optimized.
--ar 1:1 --style raw --v 6
```

### Tools to Use:
- **Midjourney** (best quality): https://midjourney.com
- **DALL-E 3** (via ChatGPT Plus): https://chat.openai.com
- **Leonardo.ai** (free tier available): https://leonardo.ai
- **Ideogram** (great for text/logos): https://ideogram.ai

### Post-Generation Steps:
1. Remove background if needed
2. Resize to exactly 1024×1024 (iOS) and 512×512 (Android)
3. Convert to PNG
4. Replace files:
   - `assets/icon.png` (1024×1024)
   - `assets/adaptive-icon.png` (1024×1024)
   - `assets/splash-icon.png` (1024×1024)
   - `assets/favicon.png` (48×48)

---

## 📸 App Store Screenshots (Priority: HIGH)

You need to **actually run the app** and take screenshots. AI can't generate these accurately.

### iOS Screenshot Sizes Required

| Device | Resolution | Quantity |
|--------|------------|----------|
| 6.7" (iPhone 15 Pro Max) | 1290 × 2796 | 6-10 |
| 6.5" (iPhone 11 Pro Max) | 1242 × 2688 | 6-10 |
| 5.5" (iPhone 8 Plus) | 1242 × 2208 | 6-10 |

### Android Screenshot Sizes Required

| Device | Resolution | Quantity |
|--------|------------|----------|
| Phone | 1080 × 1920 | 2-8 |
| Tablet | 1080 × 1920 | 2-8 |

### How to Take Screenshots

#### Option 1: iOS Simulator (macOS)
```bash
# Run on largest iPhone
npm run ios

# Take screenshots
# Press: Cmd + S (saves to Desktop)

# Or use command:
xcrun simctl io booted screenshot screenshot-1.png
```

#### Option 2: Android Emulator
```bash
# Run on Android
npm run android

# Take screenshot in emulator toolbar
# Or press: Cmd + S (macOS) / Ctrl + S (Windows)
```

#### Option 3: Physical Device
1. Run app on real iPhone/Android
2. Use device screenshot function:
   - **iOS:** Volume Up + Side Button
   - **Android:** Volume Down + Power Button

### Screenshots to Capture

1. **Main Slot Machine** - Reels spinning with big win
2. **Win Celebration Modal** - Jackpot animation
3. **Profile Screen** - Achievements and stats
4. **Shop Screen** - Coin packages
5. **Daily Bonus Modal** - Streak and rewards
6. **Events Screen** - Progress bars
7. **Level Up Modal** (if you can trigger it)
8. **Settings Screen** (optional)

### Editing Screenshots

Use **Figma**, **Canva**, or **Photoshop** to:
- Add marketing text overlay (optional)
- Crop to exact dimensions
- Add device frame (optional, looks professional)
- Export at exact required resolutions

---

## 🎵 Sound Effects (Priority: MEDIUM)

### Sounds Needed

| File | Description | Duration |
|------|-------------|----------|
| `spin-start.wav` | Reel spin start | 0.5s |
| `reel-stop.wav` | Single reel stop | 0.3s |
| `win-small.wav` | Small win (< 10x) | 1.0s |
| `win-medium.wav` | Medium win (10-50x) | 1.5s |
| `win-big.wav` | Big win (50-100x) | 2.0s |
| `jackpot.wav` | Jackpot (100x+) | 3.0s |
| `coin-collect.wav` | Coins collecting | 1.0s |
| `button-tap.wav` | UI button press | 0.1s |
| `achievement.wav` | Achievement unlock | 1.5s |
| `level-up.wav` | Level up | 2.0s |

### Free Sound Sources

#### 1. **Freesound.org** (Best for casino sounds)
- URL: https://freesound.org
- Search: "slot machine", "casino", "reel spin", "jackpot"
- License: Creative Commons (check attribution)

**Recommended searches:**
```
- "slot machine spin"
- "casino win"
- "slot reel stop"
- "coins falling"
- "jackpot alarm"
- "casino bell"
```

#### 2. **Pixabay** (No attribution required)
- URL: https://pixabay.com/sound-effects/
- Search: "casino", "slot", "win", "coins"
- License: Free for commercial use

#### 3. **Zapsplat** (High quality, free tier)
- URL: https://www.zapsplat.com
- Search: "slot machine", "casino"
- License: Free with attribution

#### 4. **Mixkit** (Free, no attribution)
- URL: https://mixkit.co/free-sound-effects/
- Search: "game", "win", "coins"

### AI Audio Generation

#### ElevenLabs (Sound Effects)
- URL: https://elevenlabs.io/sound-effects
- Prompt examples:
  ```
  - "Slot machine reels spinning fast"
  - "Casino jackpot win with bells and coins"
  - "Coins falling into a pile"
  - "Single slot reel stopping with click"
  - "Big casino win celebration with chimes"
  ```

### Processing Downloaded Sounds

Use **Audacity** (free) to:
1. Trim to exact duration
2. Normalize volume (-3dB peak)
3. Convert to .wav (22050 Hz, 16-bit, Mono)
4. Compress file size (< 50 KB each)

```bash
# Install Audacity
brew install --cask audacity  # macOS
# Or download from https://www.audacityteam.org/

# Or use ffmpeg command line:
ffmpeg -i input.mp3 -ar 22050 -ac 1 -sample_fmt s16 output.wav
```

### Save Location
Place all sound files in:
```
src/assets/sounds/
  ├── spin-start.wav
  ├── reel-stop.wav
  ├── win-small.wav
  ├── win-medium.wav
  ├── win-big.wav
  ├── jackpot.wav
  ├── coin-collect.wav
  ├── button-tap.wav
  ├── achievement.wav
  └── level-up.wav
```

---

## 🎬 App Preview Video (iOS Required)

### Specifications
- **Duration:** 15-30 seconds
- **Format:** .mp4 or .mov
- **Resolution:** 1080×1920 (portrait)
- **Size:** < 500 MB

### How to Record

#### Option 1: iOS Screen Recording
1. Enable screen recording: Settings → Control Center → Add Screen Recording
2. Open app on device
3. Swipe down, tap record button
4. Play through app (spin, win, celebrate)
5. Stop recording
6. AirDrop to computer

#### Option 2: iOS Simulator Recording (macOS)
```bash
# Start recording
xcrun simctl io booted recordVideo app-preview.mp4

# Stop with: Ctrl + C
```

#### Option 3: QuickTime (macOS)
1. Connect iPhone via USB
2. Open QuickTime Player
3. File → New Movie Recording
4. Select iPhone as camera
5. Record gameplay

### Editing Video

Use **iMovie** (free, macOS) or **CapCut** (free, cross-platform):
1. Trim to 15-30 seconds
2. Add captions (optional):
   - "Spin to Win Big!"
   - "Daily Bonuses"
   - "Unlock Achievements"
3. Add upbeat background music (royalty-free)
4. Export at 1080×1920

### Background Music Sources
- **YouTube Audio Library** (free): https://studio.youtube.com/
- **Epidemic Sound** (paid): https://www.epidemicsound.com
- **Uppbeat** (free with attribution): https://uppbeat.io

---

## 🎨 Optional: Custom Slot Symbols (Instead of Emojis)

Current game uses emojis (🍒🍋🍊🍇🔔). You can create custom graphics.

### AI Image Generation for Symbols

Each symbol should be **512×512 PNG with transparency**.

#### Cherry Symbol Prompt
```
A glossy red cherry icon for a slot machine game. Two bright red
cherries connected by green stem. Shiny highlights, subtle shadow.
Cartoon style, vibrant colors. Transparent background. Game icon
optimized. 512x512 pixels. --ar 1:1 --style raw --v 6
```

#### Lemon Symbol Prompt
```
A bright yellow lemon icon for casino slot game. Whole lemon with
leaf attached. Glossy surface, highlights, subtle drop shadow.
Vibrant cartoon style. Transparent background. Perfect square
composition. 512x512 pixels. --ar 1:1 --style raw --v 6
```

#### 7 Symbol Prompt
```
A golden lucky number 7 for slot machine. Metallic gold texture
with shine and reflections. Bold, thick font. 3D appearance with
depth. Transparent background. Game icon style. 512x512 pixels.
--ar 1:1 --style raw --v 6
```

### If You Generate Custom Symbols

Update `SymbolView.tsx`:
```typescript
import cherry from '../../assets/symbols/cherry.png';
import lemon from '../../assets/symbols/lemon.png';
// ... etc

const SYMBOL_MAP: Record<SymbolId, SymbolConfig> = {
  cherry: { image: cherry, colorKey: 'primary' },
  lemon: { image: lemon, colorKey: 'primary' },
  // ...
};

// In render:
<Image source={symbol.image} style={{ width: size, height: size }} />
```

---

## 🎯 Feature Graphic (Android Only)

### Specifications
- **Size:** 1024 × 500 pixels
- **Format:** PNG or JPEG
- **Purpose:** Displayed at top of Play Store listing

### AI Generation Prompt
```
A wide horizontal banner for a casino slot machine mobile game
called "Spin Vault". Show golden slot machine reels with lucky
7s in the center. Purple and gold color scheme. Coins and sparkles.
App logo on left side. Dynamic, exciting composition. Premium
quality. 1024x500 pixels aspect ratio. --ar 1024:500 --style raw --v 6
```

---

## 📝 Asset Checklist

### App Icons
- [ ] Generate 1024×1024 app icon
- [ ] Replace `assets/icon.png`
- [ ] Replace `assets/adaptive-icon.png`
- [ ] Replace `assets/splash-icon.png`
- [ ] Create 48×48 `favicon.png`

### Screenshots
- [ ] iPhone 15 Pro Max (1290×2796) × 6-10
- [ ] iPhone 11 Pro Max (1242×2688) × 6-10
- [ ] iPhone 8 Plus (1242×2208) × 6-10
- [ ] Android Phone (1080×1920) × 2-8
- [ ] Create `store-assets/` folder to organize

### Sounds
- [ ] Download or generate 10 sound effects
- [ ] Process with Audacity (trim, normalize)
- [ ] Save to `src/assets/sounds/`
- [ ] Test in app

### Video (iOS)
- [ ] Record 15-30 second gameplay
- [ ] Edit and add captions
- [ ] Export at 1080×1920
- [ ] Keep file < 500 MB

### Feature Graphic (Android)
- [ ] Generate 1024×500 banner
- [ ] Save for Play Store listing

---

## 🛠️ Tools Summary

| Tool | Purpose | Cost | Link |
|------|---------|------|------|
| **Midjourney** | Best quality images | $10/mo | https://midjourney.com |
| **DALL-E 3** | Via ChatGPT Plus | $20/mo | https://chat.openai.com |
| **Leonardo.ai** | Free tier available | Free/Paid | https://leonardo.ai |
| **Freesound** | Sound effects library | Free | https://freesound.org |
| **ElevenLabs** | AI sound generation | Free/Paid | https://elevenlabs.io |
| **Audacity** | Audio editing | Free | https://audacityteam.org |
| **iMovie** | Video editing (macOS) | Free | Built-in |
| **CapCut** | Video editing (all platforms) | Free | https://capcut.com |

---

## 💡 Pro Tips

1. **Consistency is Key** - Use same color scheme (purple/gold) across all assets
2. **Test on Device** - Always preview screenshots on actual phones
3. **Follow Guidelines** - Read Apple/Google asset requirements carefully
4. **Use Templates** - Search "app store screenshot template" on Figma Community
5. **A/B Test Icons** - Create 2-3 versions, ask for feedback
6. **Compress Files** - Use TinyPNG for images, keep sizes small
7. **Version Control** - Save PSD/Figma files for future edits

---

## 📞 Need Help?

- **Icon not generating well?** Try simpler prompts, focus on shape and color
- **Sounds not looping?** Use Audacity to add fade in/out
- **Screenshots wrong size?** Use online resize tools like Photopea
- **Video too large?** Re-export at lower bitrate in editing software

---

**Last Updated:** April 16, 2026
