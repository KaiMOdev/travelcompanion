import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing, borderRadius, fontSize } from "../theme";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || "An unexpected error occurred"}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.bgPrimary,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSize.body,
    color: colors.textSubtle,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.accentBlue,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontWeight: "600",
  },
});
