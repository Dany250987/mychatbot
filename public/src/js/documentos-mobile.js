// =====================================================
// DANYBOT - DOCUMENTOS MÓVIL
// Funciones nativas para Android
// =====================================================

function isNativeDocumentsApp() {
  return (
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform ===
      'function' &&
    window.Capacitor.isNativePlatform()
  );
}

function convertDocumentBlobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = reader.result;

      if (
        typeof result !== 'string' ||
        !result.includes(',')
      ) {
        reject(
          new Error(
            'No se pudo convertir el documento.'
          )
        );

        return;
      }

      resolve(result.split(',')[1]);
    };

    reader.onerror = () => {
      reject(
        new Error(
          'No se pudo leer el documento.'
        )
      );
    };

    reader.readAsDataURL(blob);
  });
}

function sanitizeMobileDocumentFileName(
  fileName
) {
  const normalizedName = String(
    fileName || 'documento'
  )
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-');

  return normalizedName || 'documento';
}

window.openDocumentInMobileApp =
  async function openDocumentInMobileApp(
    documentData,
    blob
  ) {
    if (!isNativeDocumentsApp()) {
      throw new Error(
        'El visor nativo solo está disponible en la aplicación móvil.'
      );
    }

    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error(
        'El documento recibido está vacío o no es válido.'
      );
    }

    const CapacitorPlugins =
      window.Capacitor?.Plugins || {};

    const Filesystem =
      CapacitorPlugins.Filesystem;

    const FileViewer =
      CapacitorPlugins.FileViewer;

    if (!Filesystem || !FileViewer) {
      throw new Error(
        'No se encontraron los plugins necesarios para abrir el documento.'
      );
    }

    const originalFileName =
      documentData?.file_name ||
      `documento-${documentData?.id || Date.now()}`;

    const safeFileName =
      sanitizeMobileDocumentFileName(
        originalFileName
      );

    const temporaryPath =
      `documentos/${Date.now()}-${safeFileName}`;

    const base64Data =
      await convertDocumentBlobToBase64(
        blob
      );

    await Filesystem.writeFile({
      path: temporaryPath,
      data: base64Data,
      directory: 'CACHE',
      recursive: true
    });

    const fileInfo =
      await Filesystem.getUri({
        path: temporaryPath,
        directory: 'CACHE'
      });

    if (!fileInfo?.uri) {
      throw new Error(
        'No se pudo obtener la ubicación temporal del documento.'
      );
    }

    await FileViewer.openDocumentFromLocalPath({
      path: fileInfo.uri
    });
  };

window.downloadDocumentInMobileApp =
  async function downloadDocumentInMobileApp(
    documentData,
    blob
  ) {
    console.warn(
      'Descarga nativa de documentos pendiente.',
      {
        documentId: documentData?.id,
        blobSize: blob?.size
      }
    );

    throw new Error(
      'La descarga nativa todavía no está configurada.'
    );
  };

window.shareDocumentInMobileApp =
  async function shareDocumentInMobileApp(
    documentData,
    blob
  ) {
    console.warn(
      'Compartir documento en Android está pendiente.',
      {
        documentId: documentData?.id,
        blobSize: blob?.size
      }
    );

    throw new Error(
      'La opción de compartir todavía no está configurada.'
    );
  };
  