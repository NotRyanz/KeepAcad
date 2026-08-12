import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';

type Props = { children: React.ReactNode };
type State = { error: Error | null; info: string | null };

// A last-resort safety net. Without this, an uncaught render-time error
// anywhere in the tree causes React Native to unmount the whole app,
// which on Android often looks exactly like "the app closes instantly" —
// especially on a release build where there's no red-box to explain why.
// This catches that error and shows the actual message + stack instead of
// silently dying, which makes any future issue immediately diagnosable.
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info: info.componentStack ?? null });
    // eslint-disable-next-line no-console
    console.error('Uncaught render error:', error, info);
  }

  handleReset = () => {
    this.setState({ error: null, info: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>{this.state.error.message}</Text>
            {this.state.info ? <Text style={styles.stack}>{this.state.info}</Text> : null}
            <Pressable style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Try again</Text>
            </Pressable>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0a0a0b', paddingTop: 60 },
  scroll: { padding: 24 },
  title: { color: '#f87171', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  message: { color: '#f5f5f6', fontSize: 15, marginBottom: 16, lineHeight: 22 },
  stack: { color: '#8e8e93', fontSize: 11, lineHeight: 16, marginBottom: 24 },
  button: { backgroundColor: '#f5f5f6', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#0a0a0b', fontWeight: '700', fontSize: 14 },
});
