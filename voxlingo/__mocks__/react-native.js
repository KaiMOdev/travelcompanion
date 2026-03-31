// Minimal react-native mock for Jest tests.
// Platform.OS is writable so tests can set it (e.g. Platform.OS = 'ios').

const Platform = {
  OS: 'ios',
  select: (obj) => obj[Platform.OS] ?? obj.default,
};

module.exports = {
  Platform,
};
