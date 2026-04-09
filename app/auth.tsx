import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signIn, signUp } from "../lib/hooks/useAuth";
import { showAlert } from "../lib/alert";

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      showAlert("Error", "Completá todos los campos.");
      return;
    }
    if (!isLogin && !name) {
      showAlert("Error", "Ingresá tu nombre.");
      return;
    }
    if (password.length < 6) {
      showAlert("Error", "La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email.trim(), password);
        router.replace("/(tabs)");
      } else {
        const result = await signUp(email.trim(), password, name.trim());
        // If we got a session, auto-login succeeded — navigate directly
        if (result && 'session' in result && result.session) {
          router.replace("/(tabs)");
        } else {
          // User created but needs email confirmation
          showAlert(
            "¡Cuenta creada!",
            "Revisá tu email para confirmar tu cuenta, luego iniciá sesión."
          );
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      const code = err?.message || "";
      let msg = "Ocurrió un error. Intentá de nuevo.";
      if (code.includes("Invalid login credentials")) {
        msg = "Email o contraseña incorrectos.";
      } else if (code.includes("already registered") || code.includes("already been registered")) {
        msg = "Este email ya está registrado. Iniciá sesión.";
      } else if (code.includes("rate limit")) {
        msg = "Demasiados intentos. Esperá un momento y volvé a intentar.";
      } else if (code.includes("email_address_invalid") || code.includes("invalid") && code.includes("email")) {
        msg = "El email ingresado no es válido.";
      } else if (code.includes("Password") || code.includes("password")) {
        msg = code;
      }
      showAlert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 20 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        {/* Close button */}
        <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: "flex-start", marginBottom: 32 }}>
          <Ionicons name="close" size={28} color="#1A1A1A" />
        </TouchableOpacity>

        {/* Logo area */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <Text style={styles.appName}>Pipol</Text>
          <Text style={styles.appTagline}>
            Descubrí eventos cerca tuyo
          </Text>
        </View>

        {/* Toggle tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            onPress={() => setIsLogin(true)}
            style={[styles.tabItem, isLogin && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>
              Iniciar sesión
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsLogin(false)}
            style={[styles.tabItem, !isLogin && styles.tabItemActive]}
          >
            <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>
              Registrarse
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={{ gap: 16 }}>
          {!isLogin && (
            <View>
              <Text style={styles.formLabel}>Nombre</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={18} color="#9CA3AF" />
                <TextInput
                  placeholder="Tu nombre"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>
          )}

          <View>
            <Text style={styles.formLabel}>Email</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
              <TextInput
                placeholder="tu@email.com"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
          </View>

          <View>
            <Text style={styles.formLabel}>Contraseña</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          onPress={handleAuth}
          disabled={loading}
          style={[styles.submitButton, loading && { opacity: 0.7 }]}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#1A1A1A" />
          ) : (
            <Text style={styles.submitText}>
              {isLogin ? "Entrar" : "Crear cuenta"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Forgot password */}
        {isLogin && (
          <TouchableOpacity style={{ alignItems: "center", marginTop: 16 }}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        )}

        {/* Badge */}
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={14} color="#D1D5DB" />
          <Text style={styles.badgeText}>Autenticación con Supabase</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#ffd500ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
  },
  appName: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1A1A1A",
  },
  appTagline: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  tabItemActive: {
    backgroundColor: "#ffd500ff",
  },
  tabText: {
    fontWeight: "600",
    fontSize: 14,
    color: "#9CA3AF",
  },
  tabTextActive: {
    color: "white",
  },
  formLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    color: "#1A1A1A",
    marginLeft: 12,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#ffd500ff",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  submitText: {
    color: "#1A1A1A",
    fontWeight: "700",
    fontSize: 16,
  },
  forgotText: {
    color: "#ffd500ff",
    fontSize: 14,
    fontWeight: "500",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
  },
  badgeText: {
    color: "#D1D5DB",
    fontSize: 12,
    marginLeft: 6,
  },
});
