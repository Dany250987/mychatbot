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

async function writeDocumentBlobToNativeFile({
  documentData,
  blob,
  directory,
  folder = 'DANYBOT'
}) {
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error(
      'El documento recibido está vacío o no es válido.'
    );
  }

  const Filesystem =
    window.Capacitor?.Plugins?.Filesystem;

  if (!Filesystem) {
    throw new Error(
      'No se encontró el sistema nativo de archivos.'
    );
  }

  const originalFileName =
    documentData?.file_name ||
    `documento-${documentData?.id || Date.now()}`;

  const safeFileName =
    sanitizeMobileDocumentFileName(
      originalFileName
    );

  const filePath =
    `${folder}/${safeFileName}`;

  const base64Data =
    await convertDocumentBlobToBase64(blob);

  await Filesystem.writeFile({
    path: filePath,
    data: base64Data,
    directory,
    recursive: true
  });

  const fileInfo =
    await Filesystem.getUri({
      path: filePath,
      directory
    });

  if (!fileInfo?.uri) {
    throw new Error(
      'No se pudo obtener la ubicación del documento.'
    );
  }

  return {
    fileName: safeFileName,
    filePath,
    uri: fileInfo.uri
  };
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
    if (!isNativeDocumentsApp()) {
      throw new Error(
        'La descarga nativa solo está disponible en la aplicación móvil.'
      );
    }

    const Filesystem =
      window.Capacitor?.Plugins?.Filesystem;

    if (!Filesystem) {
      throw new Error(
        'No se encontró el sistema nativo de archivos.'
      );
    }

    if (
      typeof Filesystem.requestPermissions ===
      'function'
    ) {
      await Filesystem.requestPermissions();
    }

    const savedFile =
      await writeDocumentBlobToNativeFile({
        documentData,
        blob,
        directory: 'DOCUMENTS',
        folder: 'DANYBOT'
      });

    await Swal.fire({
      title: 'Documento guardado',
      text:
        `${savedFile.fileName} fue guardado en la carpeta Documentos/DANYBOT.`,
      icon: 'success',
      confirmButtonColor: '#3c0000'
    });
  };

window.shareDocumentInMobileApp =
  async function shareDocumentInMobileApp(
    documentData,
    blob
  ) {
    if (!isNativeDocumentsApp()) {
      throw new Error(
        'La función de compartir solo está disponible en la aplicación móvil.'
      );
    }

    const Share =
      window.Capacitor?.Plugins?.Share;

    if (!Share) {
      throw new Error(
        'No se encontró el menú nativo para compartir.'
      );
    }

    const temporaryFile =
      await writeDocumentBlobToNativeFile({
        documentData,
        blob,
        directory: 'CACHE',
        folder: 'documentos-compartidos'
      });

    const canShareResult =
      typeof Share.canShare === 'function'
        ? await Share.canShare()
        : { value: true };

    if (!canShareResult.value) {
      throw new Error(
        'Este dispositivo no permite compartir archivos.'
      );
    }

    await Share.share({
      title:
        documentData?.document_name ||
        'Documento DANYBOT',

      text:
        'Documento compartido desde DANYBOT.',

      url:
        temporaryFile.uri,

      dialogTitle:
        'Compartir documento'
    });
  };
  
  