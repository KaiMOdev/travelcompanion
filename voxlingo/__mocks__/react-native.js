// Minimal react-native mock for testing hooks
module.exports = {
  Platform: { OS: "ios", select: jest.fn((obj) => obj.ios) },
  StyleSheet: { create: (styles) => styles },
  View: "View",
  Text: "Text",
  TouchableOpacity: "TouchableOpacity",
  Animated: {
    Value: jest.fn(),
    timing: jest.fn(() => ({ start: jest.fn() })),
    View: "Animated.View",
  },
  Dimensions: { get: jest.fn(() => ({ width: 375, height: 812 })) },
  AccessibilityInfo: {
    addEventListener: jest.fn(),
    announceForAccessibility: jest.fn(),
    isAccessibilityServiceEnabled: jest.fn().mockResolvedValue(false),
    isBoldTextEnabled: jest.fn().mockResolvedValue(false),
    isGrayscaleEnabled: jest.fn().mockResolvedValue(false),
    isInvertColorsEnabled: jest.fn().mockResolvedValue(false),
    isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
    isReduceTransparencyEnabled: jest.fn().mockResolvedValue(false),
    isScreenReaderEnabled: jest.fn().mockResolvedValue(false),
  },
  NativeModules: {},
  findNodeHandle: jest.fn(),
  I18nManager: { isRTL: false },
};
