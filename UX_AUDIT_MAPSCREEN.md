# MapScreen UX Audit & Fixes

## Critical Issues Identified

### 1. **Keyboard Interaction (SEVERE)**
- **Problem**: Sheet snaps to `hidden` on search focus, completely disappearing and losing context
- **User Impact**: Feels jarring, confusing, no visual feedback of what's behind keyboard
- **Fix**: Keep sheet at `collapsed` with smooth keyboard avoidance animation

### 2. **Gesture Conflicts**
- **Problem**: `isInnerScrollActiveRef` can get stuck, locking sheet drag
- **Problem**: No clear scroll boundary detection
- **Fix**: Robust scroll position tracking with automatic reset

### 3. **State Synchronization**
- **Problem**: When search completes, sheet doesn't intelligently respond to content changes
- **Problem**: Empty results don't prompt sheet to collapse
- **Fix**: Smart sheet positioning based on content state

### 4. **Inconsistent Animations**
- **Problem**: Different code paths use different animation params (tension, friction, duration)
- **Fix**: Centralized animation config for consistency

### 5. **Snap Points Feel Wrong**
- **Problem**: Jumps between positions feel too aggressive
- **Problem**: Marker press expands to full screen (too aggressive)
- **Fix**: Refined snap values, marker press → three-quarter

### 6. **No Haptic Feedback**
- **Problem**: No tactile response on snaps, makes interactions feel dead
- **Fix**: Add subtle haptics on snap completion

### 7. **Missing Keyboard Avoidance**
- **Problem**: `keyboardShiftY` referenced but not properly implemented
- **Problem**: Content gets hidden behind keyboard
- **Fix**: Proper KeyboardAvoidingView-style behavior

### 8. **Search Blur Restoration**
- **Problem**: Restoring to saved position feels confusing if user moved sheet while typing
- **Fix**: Only restore if sheet hasn't been manually dragged during focus

### 9. **Map Interaction Feedback**
- **Problem**: No indication when sheet blocks map interaction
- **Fix**: Dim map slightly when sheet is expanded, clear visual hierarchy

### 10. **Performance Issues**
- **Problem**: Multiple unnecessary re-renders on drag
- **Problem**: No animation optimization flags
- **Fix**: useNativeDriver everywhere, memoization, animation optimization

## Implementation Priority
1. Keyboard interaction (blocks core UX)
2. Gesture conflicts (causes lock-ups)
3. State synchronization (data refresh UX)
4. Animation consistency
5. Polish (haptics, feedback, performance)
