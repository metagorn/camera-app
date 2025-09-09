import { Button, StyleSheet, Text, View, Image, Pressable, Alert, SafeAreaView, Modal, FlatList, Dimensions } from "react-native";
// Camera
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";

// Layout constants for gallery grid
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const G_COLS = 3;
const G_GAP = 2;
const G_SIZE = Math.floor((SCREEN_WIDTH - G_GAP * (G_COLS - 1)) / G_COLS);

export default function App() {
  // Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState<boolean | null>(null);

  // Camera state
  const [image, setImage] = useState<string | null>(null);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [galleryLoading, setGalleryLoading] = useState<boolean>(false);
  const [galleryAssets, setGalleryAssets] = useState<Array<{ id: string; uri: string }>>([]);
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);

  // Camera ref
  const cameraRef = useRef<CameraView | null>(null);

  // Initialize media library permission state lazily (defer actual prompt until save)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const status = await MediaLibrary.getPermissionsAsync();
        if (mounted) {
          const granted = status.status === "granted";
          setHasMediaLibraryPermission(granted);
          if (granted) {
            // Preload last photo uri for thumbnail
            try {
              const recent = await MediaLibrary.getAssetsAsync({
                mediaType: [MediaLibrary.MediaType.photo],
                sortBy: [MediaLibrary.SortBy.creationTime],
                first: 1,
              });
              const uri = recent.assets?.[0]?.uri ?? null;
              if (mounted) setLastPhotoUri(uri);
            } catch {}
          }
        }
      } catch (e) {
        if (mounted) setHasMediaLibraryPermission(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Loading camera permission state
  if (!cameraPermission) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.infoText}>กำลังตรวจสอบสิทธิ์การใช้กล้อง…</Text>
      </SafeAreaView>
    );
  }

  // Camera permission not granted yet -> show request UI
  if (!cameraPermission.granted) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}> 
        <Text style={styles.title}>ต้องการสิทธิ์การใช้กล้อง</Text>
        <Text style={styles.subtitle}>
          แอพนี้ต้องการสิทธิ์เข้าถึงกล้องเพื่อถ่ายรูป
        </Text>
        <Pressable style={styles.primaryButton} onPress={requestCameraPermission}>
          <Text style={styles.primaryButtonText}>อนุญาตการใช้กล้อง</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const handleTakePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const options: any = { quality: 1, exif: false };
      const ref: any = cameraRef.current as any;
      const newPhoto: any = await ref.takePictureAsync(options);
      const uri: string | undefined = newPhoto?.uri ?? newPhoto?.assets?.[0]?.uri;
      setImage(uri ?? null);
    } catch (err) {
      console.error("Failed to take picture", err);
      Alert.alert("ถ่ายรูปไม่สำเร็จ", "กรุณาลองอีกครั้ง");
    }
  };

  const handleSaveToGallery = async () => {
    if (!image) return;
    try {
      // Ensure permission granted (request if needed)
      let allowed = hasMediaLibraryPermission;
      if (!allowed) {
        const status = await MediaLibrary.requestPermissionsAsync();
        allowed = status.status === "granted";
        setHasMediaLibraryPermission(!!allowed);
      }
      if (!allowed) {
        Alert.alert("ต้องการสิทธิ์คลังรูปภาพ", "กรุณาอนุญาตเพื่อบันทึกรูปลงเครื่อง");
        return;
      }
      setSaving(true);
      const asset = await MediaLibrary.createAssetAsync(image);
      setSaving(false);
      Alert.alert("บันทึกสำเร็จ", "รูปถูกบันทึกในแกลเลอรี่แล้ว");
      setImage(null);
      setLastPhotoUri(asset?.uri ?? image);
      // Refresh gallery list lightly if open
      if (showGallery) {
        loadRecentAssets();
      }
    } catch (err) {
      setSaving(false);
      console.error("Failed to save", err);
      Alert.alert("บันทึกไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
    }
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  const toggleTorch = () => {
    // Torch only meaningful on back camera
    setTorchOn((prev) => !prev);
  };

  const ensureMediaPermission = async (): Promise<boolean> => {
    try {
      if (hasMediaLibraryPermission) return true;
      const status = await MediaLibrary.requestPermissionsAsync();
      const allowed = status.status === "granted";
      setHasMediaLibraryPermission(allowed);
      if (!allowed) {
        Alert.alert("ต้องการสิทธิ์คลังรูปภาพ", "กรุณาอนุญาตเพื่อเข้าถึงคลังภาพ");
      }
      return allowed;
    } catch {
      return false;
    }
  };

  const loadRecentAssets = async () => {
    try {
      setGalleryLoading(true);
      const res = await MediaLibrary.getAssetsAsync({
        mediaType: [MediaLibrary.MediaType.photo],
        sortBy: [MediaLibrary.SortBy.creationTime],
        first: 60,
      });
      setGalleryAssets(res.assets.map(a => ({ id: a.id, uri: (a as any).uri })));
    } catch (e) {
      console.warn("Load gallery failed", e);
    } finally {
      setGalleryLoading(false);
    }
  };

  const openGallery = async () => {
    const allowed = await ensureMediaPermission();
    if (!allowed) return;
    await loadRecentAssets();
    setShowGallery(true);
  };

  const closeGallery = () => setShowGallery(false);

  // If an image was taken, show preview with actions
  if (image) {
    return (
      <SafeAreaView style={styles.container}>
        <Image source={{ uri: image }} style={styles.preview} resizeMode="cover" />
        <View style={styles.bottomBar}>
          <Pressable style={[styles.roundButton, styles.darkSurface]} onPress={() => setImage(null)}>
            <Ionicons name="camera-reverse" size={22} color="#E5E7EB" />
            <Text style={styles.roundButtonText}>ถ่ายใหม่</Text>
          </Pressable>
          <Pressable style={[styles.actionButton]} onPress={handleSaveToGallery} disabled={saving}>
            <Ionicons name="save" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>{saving ? "กำลังบันทึก…" : "บันทึก"}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Show live camera with controls when no image captured
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraWrapper}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          enableTorch={torchOn && facing === "back"}
          onMountError={(e) => console.warn("Camera mount error", e)}
        />

        {/* Grid overlay (rule of thirds) */}
        <View pointerEvents="none" style={styles.gridOverlay}>
          <View style={[styles.gridLine, styles.gridV, { left: "33.33%" }]} />
          <View style={[styles.gridLine, styles.gridV, { left: "66.66%" }]} />
          <View style={[styles.gridLine, styles.gridH, { top: "33.33%" }]} />
          <View style={[styles.gridLine, styles.gridH, { top: "66.66%" }]} />
        </View>

        {/* Top controls */}
        <View style={styles.topBar}>
          <Pressable onPress={toggleTorch} style={[styles.iconPill, torchOn ? styles.iconPillActive : null]} disabled={facing === "front"}>
            <Ionicons name={torchOn ? "flashlight" : "flashlight-outline"} size={20} color={facing === "front" ? "#9CA3AF" : "#fff"} />
          </Pressable>
        </View>

        {/* Bottom controls like mobile camera layout */}
        <View style={styles.bottomControls}>
          <Pressable onPress={openGallery} style={styles.thumbButton}>
            {lastPhotoUri ? (
              <Image source={{ uri: lastPhotoUri }} style={styles.thumbImage} />
            ) : (
              <View style={[styles.thumbImage, styles.thumbPlaceholder]}>
                <Ionicons name="images-outline" size={20} color="#9CA3AF" />
              </View>
            )}
          </Pressable>
          <Pressable style={({ pressed }) => [styles.shutterOuter, pressed && { transform: [{ scale: 0.96 }] }]} onPress={handleTakePicture}>
            <View style={styles.shutterInner} />
          </Pressable>
          <Pressable onPress={toggleFacing} style={styles.roundIconButton}>
            <Ionicons name="camera-reverse" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Gallery modal */}
      <Modal visible={showGallery} animationType="slide" onRequestClose={closeGallery}>
        <SafeAreaView style={styles.galleryContainer}>
          <View style={styles.galleryHeader}>
            <Pressable onPress={closeGallery} style={styles.headerIcon}>
              <Ionicons name="chevron-down" size={24} color="#fff" />
            </Pressable>
            <Text style={styles.galleryTitle}>คลังรูปภาพ</Text>
            <View style={{ width: 32 }} />
          </View>
          <View style={styles.galleryBody}>
            {galleryLoading ? (
              <View style={styles.center}><Text style={styles.infoText}>กำลังโหลด…</Text></View>
            ) : (
              <FlatList
                data={galleryAssets}
                keyExtractor={(item) => item.id}
                numColumns={3}
                renderItem={({ item }) => (
                  <Image source={{ uri: item.uri }} style={styles.galleryItem} />
                )}
                contentContainerStyle={styles.galleryList}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraWrapper: {
    flex: 1,
    position: "relative",
    backgroundColor: "#000",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 20,
    color: "#fff",
    marginBottom: 8,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
    color: "#ddd",
    textAlign: "center",
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: "#ddd",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  gridOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  gridV: {
    width: 1,
    top: 0,
    bottom: 0,
  },
  gridH: {
    height: 1,
    left: 0,
    right: 0,
  },
  preview: {
    flex: 1,
    width: "100%",
    backgroundColor: "#000",
  },
  topBar: {
    position: "absolute",
    top: 16,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bottomControls: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  thumbButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#0b0f17",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  roundIconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterBar: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  iconPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  iconPillActive: {
    backgroundColor: "rgba(79,70,229,0.65)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  iconPillText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  roundButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  darkSurface: {
    backgroundColor: "#111827",
  },
  roundButtonText: {
    color: "#E5E7EB",
    fontSize: 15,
    fontWeight: "700",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  // Gallery modal styles
  galleryContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  galleryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  galleryTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  galleryBody: {
    flex: 1,
    padding: G_GAP,
  },
  galleryItem: {
    width: G_SIZE,
    height: G_SIZE,
    marginRight: G_GAP,
    marginBottom: G_GAP,
    backgroundColor: "#0b0f17",
  },
  galleryList: {
    paddingBottom: 24,
  },
});
