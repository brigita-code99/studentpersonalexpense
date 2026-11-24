import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const COLORS = {
  background: '#062D1B',
  surface: '#103D2A',
  lightGreen: '#4ADE80',
  white: '#FFFFFF',
  muted: '#B8C9BF',
  red: '#F87171',
  border: '#285640',
};

export default function AuthScreen({
  onAuthenticate,
  initialError,
  isConfigured,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    setMessage('');
    setError('');

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    if (password.length < 6) {
      setError('Your password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onAuthenticate(email.trim(), password, isSignUp);
      setMessage(result || '');
    } catch (submitError) {
      setError(
        submitError.message || 'Authentication failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={styles.subtitle}>
            Sign in to securely sync your tracker data.
          </Text>

          {!isConfigured && (
            <Text style={styles.error}>
              Supabase is not configured. Add the project URL and publishable
              key to your environment file, then restart Expo.
            </Text>
          )}

          <TextInput
            style={styles.input}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor="#8DA99A"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            autoCapitalize="none"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            placeholder="Password (at least 6 characters)"
            placeholderTextColor="#8DA99A"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {!!(error || initialError) && (
            <Text style={styles.error}>{error || initialError}</Text>
          )}
          {!!message && <Text style={styles.message}>{message}</Text>}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (isSubmitting || !isConfigured) && styles.disabled,
            ]}
            disabled={isSubmitting || !isConfigured}
            onPress={submit}>
            <Text style={styles.primaryButtonText}>
              {isSubmitting
                ? 'Please wait...'
                : isSignUp
                ? 'Create Account'
                : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            disabled={isSubmitting}
            onPress={() => {
              setIsSignUp((current) => !current);
              setError('');
              setMessage('');
            }}>
            <Text style={styles.switchText}>
              {isSignUp
                ? 'Already have an account? Sign in'
                : 'New here? Create an account'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 20,
  },
  title: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  input: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    color: COLORS.white,
    padding: 14,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  error: {
    color: COLORS.red,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  message: {
    color: COLORS.lightGreen,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  disabled: {
    opacity: 0.6,
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  switchText: {
    color: COLORS.lightGreen,
    fontWeight: '700',
  },
});
