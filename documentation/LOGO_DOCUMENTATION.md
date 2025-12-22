# Centry Logo Design

## Overview
Custom SVG logo created for Centry using the brand's sage green color palette.

## Design Elements

### Icon
- **Shape**: Stylized "C" representing both "Centry" and circular flow of finance
- **Symbol**: Three ascending bars inside the C representing:
  - Financial growth
  - Bill payments increasing
  - Upward trend in business
- **Colors**: 
  - Primary: `#638C80` (Sage Green)
  - Gradient: `#7FA094` → `#99B4A8` (Lighter shades)

### Typography
- **Font Style**: Modern sans-serif geometric letters
- **Weight**: Medium (2.2px stroke)
- **Characters**: C-E-N-T-R-Y in clean, professional style
- **Color**: `#2C3E50` (Dark slate) for light mode, `#E5E7EB` for dark mode

## Files Created

### 1. Full Logo (Light Mode)
**File**: `/public/media/app/centry-logo.svg`
- Width: 140px, Height: 32px
- Use: Sidebar header (expanded state)
- Contains: Icon + "CENTRY" text
- Color: Sage green icon, dark text

### 2. Full Logo (Dark Mode)
**File**: `/public/media/app/centry-logo-dark.svg`
- Width: 140px, Height: 32px
- Use: Sidebar header (expanded state, dark theme)
- Contains: Icon + "CENTRY" text
- Color: Light sage icon, light gray text

### 3. Mini Logo (Icon Only)
**File**: `/public/media/app/centry-mini-logo.svg`
- Width: 32px, Height: 32px
- Use: Sidebar header (collapsed state), loader, favicon
- Contains: Just the C icon with bars
- Color: Sage green gradient

## Implementation

### Updated Components

#### 1. Sidebar Header
**File**: `/components/layouts/layout-1/components/sidebar-header.tsx`
```tsx
// Light mode
<img src="/media/app/centry-logo.svg" alt="Centry" />

// Dark mode
<img src="/media/app/centry-logo-dark.svg" alt="Centry" />

// Mini (collapsed)
<img src="/media/app/centry-mini-logo.svg" alt="Centry" />
```

#### 2. Screen Loader
**File**: `/components/screen-loader.tsx`
```tsx
<img 
  className="h-[40px] max-w-none animate-pulse"
  src="/media/app/centry-mini-logo.svg"
  alt="Centry"
/>
```

## Brand Consistency

### Color Palette Used
From `styles/globals.css`:
- **Primary**: `#638C80` (rgb(99, 140, 128)) - Sage Green
- **Light**: `#7FA094` (Lighter sage)
- **Lighter**: `#99B4A8` (Lightest sage)
- **Text**: `#2C3E50` (Dark slate)
- **Text Dark**: `#E5E7EB` (Light gray)

### Design Philosophy
1. **Professional**: Clean lines, geometric shapes
2. **Financial**: Ascending bars symbolize growth
3. **Modern**: SVG format, scalable, crisp at any size
4. **Accessible**: High contrast in both light and dark modes
5. **Memorable**: Distinctive C shape with integrated chart

## Technical Specifications

### SVG Structure
```xml
<svg viewBox="0 0 140 32" fill="none">
  <!-- Icon group -->
  <g id="icon">
    <!-- Outer C (open circle) -->
    <path stroke="#638C80" stroke-width="3"/>
    
    <!-- Three ascending rectangles -->
    <rect fill="#638C80"/>  <!-- Shortest -->
    <rect fill="#7FA094"/>  <!-- Medium -->
    <rect fill="#99B4A8"/>  <!-- Tallest -->
  </g>
  
  <!-- Text group -->
  <g id="text">
    <!-- Each letter as a path -->
    <path/> <!-- C -->
    <path/> <!-- E -->
    <path/> <!-- N -->
    <path/> <!-- T -->
    <path/> <!-- R -->
    <path/> <!-- Y -->
  </g>
</svg>
```

### Advantages of SVG
- ✅ Scales perfectly at any resolution
- ✅ Small file size (~2KB)
- ✅ No pixelation on retina displays
- ✅ Easy to modify colors via code
- ✅ Accessible with proper `alt` text
- ✅ Works in all modern browsers

## Usage Guidelines

### Do's ✅
- Use on white or light gray backgrounds
- Maintain aspect ratio when scaling
- Use provided dark mode version in dark theme
- Keep minimum height of 22px for legibility
- Use mini logo in constrained spaces

### Don'ts ❌
- Don't stretch or distort the logo
- Don't change the sage green to other colors
- Don't add shadows or effects
- Don't rotate or flip the logo
- Don't use on busy background patterns

## Future Enhancements

### Possible Additions
1. **Favicon**: Create 16x16, 32x32, 48x48 versions from mini logo
2. **App Icons**: iOS/Android app icons at various sizes
3. **Social Media**: Square versions for profiles (1024x1024)
4. **Email**: PNG exports for email signatures
5. **Print**: High-res versions for business cards, letterhead

### Animation Possibilities
```tsx
// Animated version for splash screen
<svg className="animate-pulse">
  <!-- Bars could animate height sequentially -->
</svg>
```

## Credits
- **Design**: Custom created for Centry
- **Colors**: From Centry brand guidelines
- **Inspiration**: Financial growth, circular economy, trust

## Files Summary
```
public/media/app/
├── centry-logo.svg          (140x32 - Full logo light)
├── centry-logo-dark.svg     (140x32 - Full logo dark)
└── centry-mini-logo.svg     (32x32 - Icon only)
```

## Testing Checklist
- [x] Logo displays in sidebar (expanded)
- [x] Mini logo shows in sidebar (collapsed)
- [x] Logo switches in dark mode
- [x] Loader uses mini logo
- [x] Logo is crisp at all zoom levels
- [x] Colors match brand guidelines
- [x] Alt text is descriptive
- [x] Links to dashboard from logo

---

**Last Updated**: October 15, 2025  
**Version**: 1.0  
**Status**: Implemented ✅
