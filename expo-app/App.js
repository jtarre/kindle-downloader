import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { StatusBar } from "expo-status-bar";

const OPENAI_MODEL = "gpt-4o-mini";
const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

const emptyBooks = [];

export default function App() {
  const [books, setBooks] = useState(emptyBooks);
  const [cameraActive, setCameraActive] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraRef, setCameraRef] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();

  const headerTitle = useMemo(() => {
    if (cameraActive) {
      return "Capture";
    }
    if (loading) {
      return "Finding your Kindle link";
    }
    return "Your Kindle Shelf";
  }, [cameraActive, loading]);

  const handleCapture = async () => {
    if (!cameraRef) {
      return;
    }
    setError(null);
    const photo = await cameraRef.takePictureAsync({ base64: true, quality: 0.7 });
    setPhotoUri(photo.uri);
    setCameraActive(false);
    await resolveWithOpenAI(photo.base64, photo.uri);
  };

  const resolveWithOpenAI = async (base64, uri) => {
    setLoading(true);
    setResult(null);
    setError(null);

    if (!API_KEY) {
      setLoading(false);
      setError("Missing EXPO_PUBLIC_OPENAI_API_KEY in app config.");
      return;
    }

    try {
      const payload = {
        model: OPENAI_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Identify the book in this photo. Return JSON with title, author, and kindleUrl if you can find it. If unsure, return an error field.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      };

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = `OpenAI request failed (${response.status})`;
        throw new Error(message);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned no content.");
      }

      const parsed = JSON.parse(content);
      if (parsed.error) {
        throw new Error(parsed.error);
      }

      const book = {
        id: `${Date.now()}`,
        title: parsed.title || "Unknown title",
        author: parsed.author || "Unknown author",
        kindleUrl: parsed.kindleUrl || null,
        imageUri: uri,
      };

      setBooks((prev) => [book, ...prev]);
      setResult(book);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No books yet</Text>
      <Text style={styles.emptySubtitle}>
        Capture a cover to get a Kindle sample link.
      </Text>
      <Pressable style={styles.primaryButton} onPress={() => setCameraActive(true)}>
        <Text style={styles.primaryButtonText}>Capture your first book</Text>
      </Pressable>
    </View>
  );

  const renderBook = ({ item }) => (
    <View style={styles.bookCard}>
      <Image source={{ uri: item.imageUri }} style={styles.bookImage} />
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle}>{item.title}</Text>
        <Text style={styles.bookAuthor}>{item.author}</Text>
        {item.kindleUrl ? (
          <Text style={styles.bookLink}>{item.kindleUrl}</Text>
        ) : (
          <Text style={styles.bookLinkMuted}>Kindle link unavailable</Text>
        )}
      </View>
    </View>
  );

  if (cameraActive) {
    if (!permission) {
      return <View style={styles.container} />;
    }

    if (!permission.granted) {
      return (
        <SafeAreaView style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            Camera access is required to capture a book cover.
          </Text>
          <Pressable style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Enable camera</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => setCameraActive(false)}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        </SafeAreaView>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing="back" ref={(ref) => setCameraRef(ref)}>
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraTitle}>Align the cover</Text>
            <Pressable style={styles.captureButton} onPress={handleCapture}>
              <Text style={styles.captureButtonText}>Snap</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => setCameraActive(false)}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </CameraView>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
      </View>
      {loading && photoUri ? (
        <View style={styles.processingContainer}>
          <Image source={{ uri: photoUri }} style={styles.processingImage} />
          <View style={styles.processingPanel}>
            <ActivityIndicator size="large" color="#111827" />
            <Text style={styles.processingText}>Scanning for a Kindle sample…</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={books}
          contentContainerStyle={books.length ? styles.listContent : styles.listEmpty}
          keyExtractor={(item) => item.id}
          renderItem={renderBook}
          ListEmptyComponent={renderEmptyState}
        />
      )}
      {error ? (
        <View style={styles.toastError}>
          <Text style={styles.toastErrorText}>{error}</Text>
        </View>
      ) : null}
      {result ? (
        <View style={styles.toastSuccess}>
          <Text style={styles.toastSuccessTitle}>Found!</Text>
          <Text style={styles.toastSuccessText}>{result.title}</Text>
        </View>
      ) : null}
      {!loading && !cameraActive ? (
        <Pressable style={styles.fab} onPress={() => setCameraActive(true)}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 16,
  },
  listEmpty: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    color: "#0F172A",
  },
  emptySubtitle: {
    textAlign: "center",
    color: "#475569",
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: "#F9FAFB",
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#E2E8F0",
    fontWeight: "600",
  },
  bookCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  bookImage: {
    width: 72,
    height: 96,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  bookAuthor: {
    marginTop: 4,
    color: "#64748B",
  },
  bookLink: {
    marginTop: 8,
    color: "#2563EB",
  },
  bookLinkMuted: {
    marginTop: 8,
    color: "#94A3B8",
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  cameraTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  captureButton: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 999,
  },
  captureButtonText: {
    color: "#0F172A",
    fontWeight: "700",
  },
  processingContainer: {
    flex: 1,
  },
  processingImage: {
    width: "100%",
    height: "65%",
  },
  processingPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  processingText: {
    marginTop: 12,
    color: "#0F172A",
    fontWeight: "600",
  },
  toastError: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    borderColor: "#FCA5A5",
    borderWidth: 1,
  },
  toastErrorText: {
    color: "#B91C1C",
    textAlign: "center",
  },
  toastSuccess: {
    position: "absolute",
    bottom: 90,
    left: 20,
    right: 20,
    backgroundColor: "#ECFDF3",
    borderRadius: 12,
    padding: 12,
    borderColor: "#86EFAC",
    borderWidth: 1,
  },
  toastSuccessTitle: {
    fontWeight: "700",
    color: "#166534",
    textAlign: "center",
  },
  toastSuccessText: {
    color: "#15803D",
    textAlign: "center",
    marginTop: 4,
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    backgroundColor: "#111827",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  fabText: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "700",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  permissionText: {
    color: "#E2E8F0",
    textAlign: "center",
    marginBottom: 16,
  },
});
