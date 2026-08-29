(function () {
  "use strict";

  const STORAGE_KEY = "danybot_language";
  const DEFAULT_LANGUAGE = "es";

  const translations = {
    es: {
      app: {
        personalAgenda: "Agenda Personal",
        intelligent: "Inteligente"
      },

      navigation: {
        home: "Inicio",
        activities: "Actividades",
        calendar: "Calendario",
        movements: "Movimientos",
        documents: "Documentos",
        account: "Mi cuenta",
        logout: "Cerrar sesión"
      },

      home: {
        totalActivities: "Total de actividades",
        pendingActivities: "Actividades pendientes",
        eventsToday: "Eventos hoy",
        scheduledReminders: "Avisos programados",
        monthlyExpenses: "Gastos del mes",
        monthlyIncome: "Ingresos del mes",
        estimatedSavings: "Ahorro estimado",
        eyebrow: "Agenda",
        upcomingActivities: "Próximas actividades",
        emptyTitle: "Tu agenda aparecerá aquí",
        emptyText:
          "Las actividades más próximas se mostrarán en esta sección.",
        activity: "Actividad",
        reminder: "Aviso",
        today: "Hoy",
        tomorrow: "Mañana",
        openActivity: "Abrir actividad",
        assistant: "Asistente",
        searchTitle: "¿Qué quieres encontrar?",
        searchPlaceholder: "Buscar por ejemplo: internet",
        searchButton: "Buscar",
        hello: "Hola",
        user: "Usuario"
      },

      common: {
        preparingDay: "Preparando tu día..."
      },
      globalSearch: {
        sessionExpiredTitle: "Sesión vencida",
        sessionExpiredText: "Tu sesión venció. Inicia sesión nuevamente.",
        activity: "Actividad",
        expense: "Gasto",
        monthlyIncome: "Ingreso mensual",
        additionalIncome: "Ingreso adicional",
        document: "Documento",
        result: "Resultado",
        noResultsTitle: "No encontré resultados",
        noResultsText: "Intenta buscar con otra palabra, categoría, fecha o valor.",
        resultsFound: "Resultados encontrados",
        resultSingular: "resultado",
        resultPlural: "resultados",
        noTitle: "Sin título",
        noDescription: "Sin descripción",
        searchFailedTitle: "No se pudo buscar",
        searchFailedText: "Ocurrió un error al realizar la búsqueda.",
        errorTitle: "Error",
        globalSearchFailedText: "No fue posible realizar la búsqueda global.",
        personal: "Personal",
        finances: "Finanzas",
        study: "Estudio",
        work: "Trabajo",
        health: "Salud",
        payments: "Pagos",
        other: "Otro",
        bill: "Factura",
        food: "Alimentación",
        transportation: "Transporte",
        entertainment: "Entretenimiento",
        loans: "Préstamos",
        mainIncome: "Ingreso principal",
        personalDocument: "Documento personal",
        active: "Activo",
        completed: "Completado",
        trash: "Papelera"
      },
      activities: {
        sectionTitle: "Tus actividades",
        loading: "Cargando actividades",
        badge: "Actividades",
        organizeTitle: "Organiza tus actividades",
        organizeText:
          "Crea pendientes, avisos y recordatorios con prioridad, fecha límite y alertas opcionales.",
        newActivity: "Nueva actividad",
        addManual: "Agregar actividad manual",
        title: "Título",
        titlePlaceholder: "Ej: Pagar internet",
        description: "Descripción",
        descriptionPlaceholder:
          "Ej: Pago mensual del servicio de internet",
        priority: "Prioridad",
        medium: "Media",
        high: "Alta",
        low: "Baja",
        category: "Categoría",
        personal: "Personal",
        health: "Salud",
        work: "Trabajo",
        finance: "Finanzas",
        date: "Fecha",
        dueDate: "Fecha límite",
        reminderTime: "Hora de aviso",
        repeat: "Repetición",
        once: "Una vez",
        daily: "Diario",
        weekly: "Semanal",
        monthly: "Mensual",
        yearly: "Anual",
        saveActivity: "Guardar actividad",
        myActivities: "Mis actividades",
        searchPlaceholder:
          "Buscar por título, descripción, categoría o prioridad...",
        noDescription: "Sin descripción adicional.",
        noTime: "Sin hora",
        reminder: "Aviso",
        trash: "Papelera",
        edit: "Editar",
        delete: "Eliminar",
        editActivity: "Editar actividad",
        reminderNotFound: "Recordatorio no encontrado",
        reminderNotFoundEdit:
          "No se encontró el recordatorio para editar.",
        descriptionOptional:
          "Agrega una descripción opcional",
        reminderDate: "Fecha de aviso",
        study: "Estudio",
        payments: "Pagos",
        other: "Otro",
        status: "Estado",
        active: "Activo",
        completed: "Completado",
        overdue: "Vencido",
        today: "Hoy",
        saveChanges: "Guardar cambios",
        cancel: "Cancelar",
        allDates: "Todas las fechas",
        allPriorities: "Todas",
        allStatuses: "Todos",
        taskListening: "Escuchando...",
        taskCreateByVoice: "Crear por voz",
        taskVoicePrompt: "Di la tarea que quieres crear",
        voiceQuestion: "¿Qué quieres que te recuerde?",
        voicePrompt: "Toca el micrófono para empezar a hablar.",
        restore: "Restaurar",
        complete: "Completar",
        detectedReminder: "Recordatorio detectado",
        notDetected: "No detectada",
        time: "Hora",
        updateFailedTitle: "No se pudo actualizar",
        updateFailedText: "No se pudo actualizar la actividad.",
        completeNotFoundText:
          "No se encontró la actividad para completar.",
        completeFailedTitle: "No se pudo completar",
        completeFailedText:
          "No se pudo completar la actividad.",
        completeErrorText:
          "Ocurrió un error al completar la actividad.",
        saveFailedTitle: "No se pudo guardar",
        saveFailedText:
          "No se pudo guardar la actividad.",
        exactAlertsTitle: "Permitir avisos exactos",
        exactAlertsText:
          "Para avisarte exactamente a la hora programada, Día en Orden necesita permiso para usar alarmas y recordatorios.",
        goToSettings: "Ir a configuración",
        notNow: "Ahora no",
        listening:
          "Escuchando... di tu recordatorio completo.",
        couldNotListen: "No se pudo escuchar",
        noTextDetected: "No se detectó ningún texto.",
        microphoneUnavailable:
          "No se pudo usar el micrófono.",
        voiceError: "Error de voz",
        microphoneError:
          "No fue posible usar el micrófono del celular.",
        microphoneUnsupported:
          "Micrófono no compatible",
        microphoneUnsupportedText:
          "Tu navegador no soporta reconocimiento de voz. Prueba en Google Chrome.",
        microphoneStartFailed:
          "No se pudo iniciar el micrófono",
        tryAgain: "Intenta nuevamente.",
        microphonePermissionError:
          "Revisa el permiso del micrófono o intenta nuevamente.",
        voiceNativePrompt:
          "Di el recordatorio que quieres crear",
        thisWeek: "Esta semana",
        thisMonth: "Este mes",
        overduePlural: "Vencidos",
        deleted: "Eliminados",
        noDeletedTitle: "No hay actividades eliminadas",
        noDeletedText:
          "No se encontraron actividades eliminadas con los filtros seleccionados.",
        noOverdueTitle: "No hay actividades vencidas",
        noOverdueText:
          "No se encontraron actividades vencidas con los filtros seleccionados.",
        noTodayTitle: "No hay actividades para hoy",
        noTodayText:
          "No se encontraron actividades para hoy con los filtros seleccionados.",
        noWeekTitle: "No hay actividades esta semana",
        noWeekText:
          "No se encontraron actividades para esta semana con los filtros seleccionados.",
        noMonthTitle: "No hay actividades este mes",
        noMonthText:
          "No se encontraron actividades para este mes con los filtros seleccionados.",
        noHighTitle:
          "No hay actividades de prioridad alta",
        noHighText:
          "No se encontraron actividades de prioridad alta con los filtros seleccionados.",
        noMediumTitle:
          "No hay actividades de prioridad media",
        noMediumText:
          "No se encontraron actividades de prioridad media con los filtros seleccionados.",
        noLowTitle:
          "No hay actividades de prioridad baja",
        noLowText:
          "No se encontraron actividades de prioridad baja con los filtros seleccionados.",
        noActivitiesTitle:
          "No hay actividades para mostrar",
        noActivitiesText:
          "Cuando registres una actividad, aparecerá aquí.",
        updatedTitle: "Actividad actualizada",
        updatedText: "Los cambios fueron guardados correctamente.",
        editErrorText: "Ocurrió un error al editar la actividad.",
        deleteActivityTitle: "¿Eliminar actividad?",
        deleteActivityText:
          "La actividad se moverá a Eliminados y podrás restaurarla mientras permanezca allí.",
        deleteFailedTitle: "No se pudo eliminar",
        deleteFailedText: "No se pudo eliminar la actividad.",
        ok: "Aceptar",
        deletedTitle: "Actividad eliminada",
        movedToDeletedSuffix: "se movió a Eliminados.",
        movedToDeletedText: "La actividad se movió a Eliminados.",
        deleteErrorText: "Ocurrió un error al eliminar la actividad.",
        restoreNotFoundText:
          "No se encontró la actividad para restaurar.",
        restoreFailedTitle: "No se pudo restaurar",
        restoreFailedText: "No se pudo restaurar la actividad.",
        restoreErrorText: "Ocurrió un error al restaurar la actividad.",
        deletePermanentlyTitle: "¿Eliminar definitivamente?",
        deletePermanentlyText:
          "Esta actividad se borrará de forma permanente y ya no podrá recuperarse.",
        deletePermanentlyFailedText:
          "No se pudo eliminar definitivamente la actividad.",
        deletedPermanentlySuffix: "se eliminó definitivamente.",
        deletedPermanentlyText:
          "La actividad se eliminó definitivamente.",
        deletePermanentlyErrorText:
          "Ocurrió un error al eliminar definitivamente la actividad.",
        emptyDeletedTitle: "¿Vaciar eliminados?",
        deletePermanentlyPrefix: "Se eliminarán definitivamente",
        activitySingular: "actividad",
        activityPlural: "actividades",
        empty: "Vaciar",
        emptyDeletedButton: "Vaciar eliminados",
        emptyFailedTitle: "No se pudo vaciar",
        emptyFailedText: "No se pudieron eliminar las actividades.",
        oneDeletedPermanently:
          "Se eliminó 1 actividad definitivamente.",
        manyDeletedPermanentlyPrefix:
          "Se eliminaron",
        manyDeletedPermanentlySuffix:
          "actividades definitivamente.",
        emptyDeletedErrorText:
          "Ocurrió un error al vaciar las actividades eliminadas."
      },
      movements: {
        sectionTitle: "Movimientos",
        personalFinanceControl: "Control financiero personal",
        organizeExpenses: "Organiza tus gastos de forma simple",
        organizeExpensesText:
          "Registra facturas, pagos diarios y compras del mes para visualizar mejor en qué estás gastando tu dinero.",
        backHome: "Volver al inicio",
        addExpense: "Registrar gasto",
        bills: "Facturas",
        servicesPayments: "Servicios y pagos",
        dailyExpenses: "Gastos diarios",
        monthlyControl: "Control mensual",
        monthlyTotal: "Total del mes",
        registeredExpenses: "Gastos registrados",
        highestExpense: "Gasto más alto",
        workingMonth: "Mes de trabajo",
        workingMonthText:
          "Selecciona el mes que quieres consultar antes de registrar, revisar o analizar tus movimientos.",
        month: "Mes",
        filterMovements: "Filtrar movimientos",
        all: "Todos",
        income: "Ingresos",
        expenses: "Gastos",
        addExpenseTitle: "Registrar gasto",
        addExpenseText:
          "Agrega gastos manualmente o usa el dictado por voz.",
        hide: "Ocultar",
        voiceExpense: "Dictar gasto por voz",
        expenseDate: "Fecha del gasto",
        category: "Categoría",
        selectCategory: "Selecciona una categoría",
        bill: "Factura",
        food: "Alimentación",
        transportation: "Transporte",
        health: "Salud",
        entertainment: "Entretenimiento",
        loans: "Préstamos",
        other: "Otro",
        description: "Descripción",
        descriptionPlaceholder:
          "Ej: Pago de servicio público, compra de alimentos, transporte diario...",
        downloadReport: "Descargar Reporte",
        newMovement: "Nuevo movimiento",
        whatAdd: "¿Qué deseas agregar?",
        close: "Cerrar",
        addExpenseOption: "Agregar gasto",
        expenseOptionText: "Registrar una compra o pago",
        addIncome: "Agregar ingreso",
        incomeOptionText: "Registrar dinero recibido",
        backOptions: "Volver a las opciones",
        addMovement: "Agregar movimiento",
        noIncomeTitle: "No hay ingresos para este mes",
        noIncomeText:
          "Cuando registres un ingreso, aparecerá listado en esta sección.",
        noMovementsTitle: "No hay movimientos para este mes",
        noMovementsText:
          "Cuando registres un ingreso o gasto, aparecerá listado en esta sección.",
        useToday: "Usar fecha de hoy",
        changeDate: "Cambiar fecha",
        loading: "Cargando tus movimientos",
        photoOf: "Foto de",
        initialsOf: "Iniciales de",
        user: "usuario",
        date: "Fecha",
        source: "Origen",
        evidence: "Evidencia",
        noEvidence: "Sin evidencia",
        view: "Ver",
        edit: "Editar",
        delete: "Eliminar",
        type: "Tipo",
        value: "Valor",
        incomeLabel: "Ingreso",
        updateIncome: "Actualizar ingreso",
        manual: "Manual",
        voice: "Por voz",
        viewerUnavailableTitle: "Visor no disponible",
        viewerUnavailableText:
          "No se encontró el visor nativo de archivos en la app.",
        pdfOpenFailedTitle: "No se pudo abrir el PDF",
        pdfOpenFailedText:
          "El archivo se recibió, pero no se pudo abrir con el visor del celular.",
        selectedMonth: "Mes seleccionado",
        additionalIncomeSummary: "Ingresos adicionales",
        estimatedSavings: "Ahorro estimado",
        mainIncome: "Ingreso principal",
        monthlyIncomeValue: "Valor del ingreso mensual",
        saveMainIncome: "Guardar ingreso principal",
        additionalIncomeTitle: "Ingreso adicional",
        incomeDate: "Fecha",
        incomeDescription: "Descripción",
        incomeDescriptionPlaceholder: "Ej: Freelance, venta, prima, bono...",
        incomeValue: "Valor",
        addAdditionalIncome: "Agregar ingreso adicional",
        addIncomeShort: "Agregar ingreso",
        registeredAdditionalIncomes: "Ingresos adicionales registrados",
        noAdditionalIncomes:
          "No hay ingresos adicionales registrados para este mes.",
        sessionExpiredTitle: "Sesión vencida",
        expenseUpdatedTitle: "Gasto actualizado",
        expenseRegisteredTitle: "Gasto registrado",
        expenseUpdatedText:
          "La información del gasto fue actualizada correctamente.",
        expenseRegisteredText: "El gasto fue guardado correctamente.",
        fileNotAllowedTitle: "Archivo no permitido",
        fileNotAllowedText: "La evidencia debe ser PDF, JPG, PNG o WEBP.",
        fileTooLargeTitle: "Archivo muy pesado",
        fileTooLargeText: "La evidencia no puede superar los 5 MB.",
        evidenceUnavailableTitle: "Evidencia no disponible",
        expenseEvidenceTitle: "Evidencia del gasto",
        back: "Volver",
        genericErrorTitle: "Error",
        evidenceOpenErrorText:
          "Ocurrió un error al abrir la evidencia.",
        deleteFailedTitle: "No se pudo eliminar",
        genericErrorText: "Ocurrió un error.",
        expenseDeletedTitle: "Gasto eliminado",
        expenseDeletedText: "El gasto fue eliminado correctamente.",
        expenseDeleteErrorText:
          "Ocurrió un error al eliminar el gasto.",
        updateExpense: "Actualizar gasto",
        saveExpense: "Guardar gasto",
        expenseNotFoundEdit:
          "No se encontró el gasto para editar.",
        voiceUnavailableTitle: "Voz no disponible",
        nativeVoiceUnavailableText:
          "No se encontró la configuración de voz nativa.",
        couldNotListenTitle: "No se pudo escuchar",
        noTextDetectedText: "No se detectó ningún texto.",
        voiceErrorTitle: "Error de voz",
        voiceMicrophoneErrorText:
          "No fue posible usar el micrófono del celular.",
        speechUnavailableTitle:
          "Reconocimiento de voz no disponible",
        speechUnavailableText:
          "Tu navegador no permite usar dictado por voz en esta página. Prueba con Chrome.",
        noVoiceTitle: "No se detectó voz",
        noVoiceText:
          "No logré escuchar ningún texto. Intenta nuevamente.",
        microphoneCheckText:
          "Revisa el permiso del micrófono o intenta hablar más cerca del dispositivo.",
        editingExpenseTitle: "Estás editando un gasto",
        editingExpenseText:
          "Termina o cancela la edición antes de guardar un gasto por voz automáticamente.",
        amountNotDetectedTitle: "No detecté el valor",
        expenseAmountNotDetectedText:
          "No pude identificar el monto del gasto. Revisa el formulario y guárdalo manualmente.",
        saveFailedTitle: "No se pudo guardar",
        voiceExpenseSaveFailedText:
          "No se pudo guardar el gasto por voz.",
        expenseAutoSavedTitle:
          "Gasto guardado automáticamente",
        expenseAutoSavedSuffix:
          "fue registrado correctamente.",
        voiceExpenseSaveErrorText:
          "Ocurrió un error al guardar el gasto por voz.",
        noDataExportTitle: "Sin datos para exportar",
        noDataExportText:
          "No hay ingresos ni gastos registrados para el mes seleccionado.",
        excelGeneratedTitle: "Excel generado",
        excelGeneratedText:
          "El reporte mensual fue descargado correctamente.",
        exportFailedTitle: "No se pudo exportar",
        exportFailedText:
          "El reporte fue generado, pero no se pudo guardar o compartir en el teléfono.",
        invalidIncomeTitle: "Ingreso inválido",
        invalidIncomeText:
          "Ingresa un valor válido para el ingreso mensual.",
        incomeSaveErrorText:
          "Ocurrió un error al guardar el ingreso.",
        incomeSavedTitle: "Ingreso guardado",
        incomeSavedText:
          "El ingreso mensual fue guardado correctamente.",
        monthlyIncomeSaveErrorText:
          "Ocurrió un error al guardar el ingreso mensual.",
        incomeVoiceMobileOnlyText:
          "El dictado de ingresos está disponible en la aplicación móvil.",
        incomeAmountNotDetectedText:
          "Revisa el ingreso y completa el valor manualmente.",
        incompleteDataTitle: "Datos incompletos",
        incompleteAdditionalIncomeText:
          "Completa la fecha, descripción y valor del ingreso adicional.",
        updateFailedTitle: "No se pudo actualizar",
        additionalIncomeProcessErrorText:
          "Ocurrió un error al procesar el ingreso adicional.",
        additionalIncomeUpdatedTitle:
          "Ingreso adicional actualizado",
        additionalIncomeSavedTitle:
          "Ingreso adicional guardado",
        additionalIncomeUpdatedText:
          "El ingreso adicional fue actualizado correctamente.",
        additionalIncomeSavedText:
          "El ingreso adicional fue registrado correctamente.",
        additionalIncomeDeleteErrorText:
          "Ocurrió un error al eliminar el ingreso adicional.",
        listening: "Escuchando...",
        dictateExpenseVoice: "Dictar gasto por voz",
        expenseVoicePrompt: "Di el gasto que quieres registrar",
        dictateIncomeVoice: "Dictar ingreso por voz",
        incomeVoicePrompt: "Di el ingreso que quieres registrar",
        reportMonth: "Mes",
        reportIncomeSection: "INGRESOS",
        reportExpensesBalanceSection: "GASTOS Y BALANCE",
        reportMonthlyIncome: "Ingreso mensual",
        reportTotalExpenses: "Total gastos",
        reportOtherIncome: "Otros ingresos",
        reportBalanceSavings: "Balance / ahorro",
        reportTotalIncome: "Total ingresos",
        reportMonthlyMovements: "Movimientos del mes",
        reportMonthlyIncomeDetail: "DETALLE DEL INGRESO MENSUAL",
        reportNoDescription: "Sin descripción registrada",
        reportType: "Tipo",
        reportDateMonth: "Fecha / Mes",
        reportDescription: "Descripción",
        reportAmount: "Valor",
        reportSource: "Origen",
        reportAdditional: "Adicional",
        reportIncomeSheet: "Ingresos",
        reportDate: "Fecha",
        reportCategory: "Categoría",
        reportEvidence: "Evidencia",
        reportRegistrationDate: "Fecha de registro",
        reportExpensesSheet: "Gastos",
        reportSavings: "Ahorro",
        reportMonthlySummary: "Resumen del mes",
        voiceExpenseDefaultDescription: "Gasto registrado por voz",
        voiceIncomeDefaultDescription: "Ingreso registrado por voz",
        shareReportTitle: "Reporte mensual - Día en Orden",
        shareReportPrefix: "Reporte financiero de Día en Orden correspondiente a",
        expenseEvidenceOptional: "Evidencia opcional",
        selectEvidenceFile: "Seleccionar archivo",
        noEvidenceFileSelected: "Ningún archivo seleccionado",
        evidenceFileHelp: "Puedes adjuntar PDF, JPG, PNG o WEBP. Máximo 5 MB. No es obligatorio.",
        expenseAmountPlaceholder: "Ej: 51000",
        mainIncomeAmountPlaceholder: "Ej: 3000000",
        additionalIncomeAmountPlaceholder: "Ej: 300000",
        mainIncomeDescriptionPlaceholder: "Ej: Salario mensual, pago de nómina...",
        monthlyIncomeSummaryLabel: "Ingreso mensual",
        actions: "Acciones",
        reportTitle: "REPORTE MENSUAL - DÍA EN ORDEN",
        reportIncomeTitle: "INGRESOS - DÍA EN ORDEN",
        reportExpensesTitle: "GASTOS - DÍA EN ORDEN",
        shareReportDialogTitle: "Guardar o compartir reporte",
        dayLabel: "Día",
        evidencePreviewUnavailable: "Este tipo de archivo no se puede previsualizar directamente en la app.",
        openFile: "Abrir archivo"
      },
      documents: {
        sectionTitle: "Documentos",
        personalSpace: "Espacio personal",
        heroTitle: "Tus documentos importantes, siempre disponibles",
        heroText: "Guarda, consulta y comparte tus archivos personales desde un solo lugar.",
        addDocument: "Agregar documento",
        searchPlaceholder: "Buscar documento",
        oneDocument: "1 documento",
        documentsSuffix: "documentos",
        loading: "Cargando documentos...",
        personalDocument: "Documento personal",
        close: "Cerrar",
        documentName: "Nombre del documento",
        documentNamePlaceholder: "Ejemplo: Cédula de ciudadanía",
        file: "Archivo",
        selectFile: "Seleccionar archivo",
        fileHelp: "PDF, JPG, PNG o WEBP · máximo 5 MB",
        noFileSelected: "Ningún archivo seleccionado",
        cancel: "Cancelar",
        save: "Guardar",
        editDocument: "Editar documento",
        currentFile: "Archivo actual",
        savedDocument: "Documento guardado",
        keepCurrentFile: "Conservar archivo actual",
        sessionExpired: "Sesión vencida",
        loadFailedText: "No se pudieron consultar los documentos.",
        loadErrorTitle: "No pudimos cargar tus documentos",
        loadErrorText: "Revisa tu conexión e inténtalo nuevamente.",
        noMatchesTitle: "No encontramos coincidencias",
        noDocumentsTitle: "Aún no tienes documentos",
        tryAnotherName: "Prueba con otro nombre.",
        addFirstDocument: "Agrega tu primer documento personal.",
        unnamedDocument: "Documento sin nombre",
        view: "Ver",
        viewDocument: "Ver documento",
        download: "Descargar",
        downloadDocument: "Descargar documento",
        share: "Compartir",
        shareDocument: "Compartir documento",
        edit: "Editar",
        editDocumentAction: "Editar documento",
        delete: "Eliminar",
        deleteDocumentAction: "Eliminar documento",
        fileNotAllowedTitle: "Archivo no permitido",
        fileNotAllowedText: "Solo puedes cargar PDF, JPG, PNG o WEBP.",
        fileTooLargeTitle: "Archivo demasiado grande",
        fileTooLargeText: "El documento no puede superar los 5 MB.",
        enterDocumentName: "Escribe el nombre del documento.",
        selectAFile: "Selecciona un archivo.",
        saving: "Guardando",
        saveFailedText: "No se pudo guardar el documento.",
        updatedTitle: "Documento actualizado",
        savedTitle: "Documento guardado",
        updatedText: "El documento fue actualizado correctamente.",
        savedText: "El documento fue guardado correctamente.",
        openFailedTitle: "No se pudo abrir",
        downloadFailedTitle: "No se pudo descargar",
        sharedFromDanybot: "Documento compartido desde DANYBOT",
        shareFromWebTitle: "Compartir desde la web",
        shareFromWebText: "Tu navegador no permite compartir archivos directamente. Puedes descargarlo y adjuntarlo manualmente.",
        shareFailedTitle: "No se pudo compartir",
        shareFailedText: "No fue posible compartir el documento.",
        deleteTitle: "Eliminar documento",
        deletePrefix: "Se eliminará",
        deleteFailedText: "No se pudo eliminar el documento.",
        deletedTitle: "Documento eliminado",
        deletedText: "El documento fue eliminado correctamente.",
        nativeConversionFailed: "No se pudo convertir el documento.",
        nativeReadFailed: "No se pudo leer el documento.",
        nativeInvalidDocument: "El documento recibido está vacío o no es válido.",
        nativeLocationFailed: "No se pudo obtener la ubicación del documento.",
        nativePluginsMissing: "No se encontraron los plugins necesarios para abrir el documento.",
        nativeTemporaryLocationFailed: "No se pudo obtener la ubicación temporal del documento.",
        nativeSavedTextSuffix: "fue guardado en la carpeta Documentos/DANYBOT.",
        nativeShareOnlyMobile: "La función de compartir solo está disponible en la aplicación móvil.",
        nativeShareMenuMissing: "No se encontró el menú nativo para compartir.",
        nativeShareUnsupported: "Este dispositivo no permite compartir archivos.",
        nativeShareTitle: "Documento DANYBOT",
        nativeShareText: "Documento compartido desde DANYBOT.",
        pageTitle: "Mis documentos",
        retrieveFileFailedText: "No se pudo recuperar el archivo.",
        deleteFailedTitle: "No se pudo eliminar",
        nativeFileSystemMissing: "No se encontró el sistema nativo de archivos.",
        nativeViewerOnlyMobile: "El visor nativo solo está disponible en la aplicación móvil.",
        nativeDownloadOnlyMobile: "La descarga nativa solo está disponible en la aplicación móvil.",
        avatar: "Avatar"
      },

      login: {
        pageTitle: "Día en Orden | Iniciar sesión",
        language: "Idioma",
        visualTitle: "Organiza tu día desde un solo lugar",
        visualText: "Gestiona tareas, gastos, recordatorios y calendario con una experiencia simple, bonita y personal.",
        tasks: "Tareas",
        tasksText: "Prioriza tu día",
        expenses: "Gastos",
        expensesText: "Controla tu mes",
        agenda: "Agenda",
        agendaText: "No olvides nada",
        welcomeBack: "Bienvenida de nuevo",
        continueLineOne: "Inicia sesión para continuar",
        continueLineTwo: "y organizar mejor tu día.",
        continueWithEmail: "o continúa con tu correo",
        email: "Correo electrónico",
        emailPlaceholder: "Ingresa tu correo electrónico",
        password: "Contraseña",
        passwordPlaceholder: "Ingresa tu contraseña",
        togglePassword: "Mostrar u ocultar contraseña",
        signIn: "Iniciar sesión",
        fingerprintSignIn: "Ingresar con huella",
        forgotPassword: "¿Olvidaste tu contraseña?",
        noAccount: "¿No tienes una cuenta?",
        createFreeAccount: "Crear cuenta gratis",
        accessCorrect: "Acceso correcto. Aquí se cargará el chatbot...",
        incompleteTitle: "Datos incompletos",
        enterEmailPassword: "Ingresa tu correo y contraseña.",
        loginFailedTitle: "No se pudo iniciar sesión",
        invalidCredentials: "Correo o contraseña incorrectos.",
        welcomeTitle: "Bienvenida",
        hello: "Hola",
        loginSuccessSuffix: "ingresaste correctamente.",
        passwordResetTitle: "Recuperar contraseña",
        passwordResetText: "Ingresa el correo registrado en tu cuenta.",
        sendCode: "Enviar código",
        cancel: "Cancelar",
        enterEmail: "Ingresa tu correo.",
        codeSentTitle: "Código enviado",
        codeSentText: "Enviamos un código de recuperación a:",
        verificationCode: "Código de verificación",
        newPassword: "Nueva contraseña",
        confirmNewPassword: "Confirmar nueva contraseña",
        changePassword: "Cambiar contraseña",
        completeResetData: "Completa el código y la nueva contraseña.",
        passwordMinLength: "La contraseña debe tener al menos 6 caracteres.",
        passwordMismatch: "Las contraseñas no coinciden.",
        passwordUpdatedTitle: "Contraseña actualizada",
        passwordUpdatedText: "Ya puedes iniciar sesión con tu nueva contraseña.",
        passwordResetFailed: "No se pudo cambiar la contraseña.",
        googleNoCredential: "Google no devolvió una credencial válida.",
        googleLoginProblem: "Hubo un problema al iniciar sesión con Google.",
        googleUnavailableTitle: "Google no disponible",
        googleUnavailableText: "El login nativo de Google no está disponible en este dispositivo.",
        connectingGoogle: "Conectando con Google...",
        googlePluginUnavailable: "Plugin SocialLogin no disponible.",
        googleInvalidToken: "Google no devolvió un idToken válido.",
        googleValidationError: "Ocurrió un error al validar tu cuenta de Google.",
        googleErrorTitle: "Error con Google",
        googleErrorText: "No fue posible iniciar sesión con Google.",
        continueGoogle: "Continuar con Google",
        biometricUnavailable: "La biometría no está disponible.",
        biometricPluginUnavailable: "BiometricAuth no está disponible.",
        biometricReason: "Confirma tu identidad para acceder a DANYBOT",
        biometricAndroidTitle: "Acceso a DANYBOT",
        biometricAndroidSubtitle: "Usa tu huella para continuar",
        biometricActivateTitle: "¿Activar acceso con huella?",
        biometricActivateText: "La próxima vez podrás entrar a DANYBOT usando la huella de este dispositivo.",
        biometricActivateButton: "Activar huella",
        notNow: "Ahora no",
        biometricActivatedTitle: "Huella activada",
        biometricActivatedText: "Ya puedes ingresar a DANYBOT con tu huella.",
        biometricAccessUnavailableTitle: "Acceso biométrico no disponible",
        biometricAccessUnavailableText: "Inicia sesión nuevamente con tu correo o Google.",
        sessionExpiredTitle: "Sesión vencida",
        sessionExpiredText: "Por seguridad, inicia sesión nuevamente. Después podrás volver a usar tu huella."
      },
      signup: {
        pageTitle: "Día en Orden | Crear cuenta",
        kicker: "Crear cuenta",
        title: "Únete a Día en Orden",
        intro: "Ingresa tus datos para comenzar a organizar tu día de forma simple y práctica. Validaremos tu correo con un código antes de crear la cuenta.",
        name: "Nombre",
        namePlaceholder: "Ingresa tu nombre",
        email: "Correo electrónico",
        emailPlaceholder: "Ingresa tu correo electrónico",
        birthDate: "Fecha de nacimiento",
        phone: "Número de teléfono",
        password: "Contraseña",
        confirmPassword: "Confirmar contraseña",
        confirmPasswordPlaceholder: "Ingresa tu contraseña",
        togglePassword: "Mostrar u ocultar contraseña",
        toggleConfirmPassword: "Mostrar u ocultar confirmación de contraseña",
        cancel: "Cancelar",
        createAccount: "Crear cuenta",
        sendingCode: "Enviando código...",
        alreadyAccount: "¿Ya tienes una cuenta?",
        signIn: "Inicia sesión",
        verificationSendFailed: "No se pudo enviar el código de verificación.",
        verificationFailed: "No se pudo verificar el código.",
        verifyEmailTitle: "Verifica tu correo",
        verificationSentText: "Te enviamos un código de verificación a:",
        checkInboxText: "Revisa tu bandeja de entrada o spam.",
        verificationCode: "Código de verificación",
        verificationPlaceholder: "Ej: 123456",
        verifyCreateAccount: "Verificar y crear cuenta",
        enterVerificationCode: "Ingresa el código que llegó a tu correo.",
        passwordsDifferentTitle: "Contraseñas diferentes",
        passwordsMismatch: "Las contraseñas no coinciden.",
        accountCreatedTitle: "Cuenta creada",
        accountCreatedText: "Tu cuenta fue creada y el correo fue verificado correctamente.",
        accountCreateFailedTitle: "No se pudo crear la cuenta",
        accountCreateFailedText: "Ocurrió un error al registrarte."
      },
      account: {
        title: "Mi cuenta",
        accountInfo: "Información de cuenta",
        name: "Nombre",
        email: "Correo",
        userId: "ID de usuario",
        notRegistered: "No registrado",
        noEmail: "Sin correo registrado",
        session: "Sesión",
        logout: "Cerrar sesión",
        logoutDescription:
          "Sal de tu cuenta actual para ingresar con otro usuario.",
        deleteAccount: "Eliminar cuenta",
        sessionNotFoundTitle: "Sesión no encontrada",
        sessionNotFoundText: "No se pudo identificar el usuario actual.",
        deleteAccountTitle: "Eliminar cuenta",
        deletePermanentWarning:
          "Esta acción eliminará permanentemente tu cuenta y todos tus datos.",
        deleteConfirmInstruction:
          "Para confirmar, escribe:",
        deleteConfirmPlaceholder:
          "Escribe ELIMINAR",
        deletePasswordHelp:
          "Si tu cuenta fue creada con contraseña, ingrésala también. Si fue creada con Google, puedes dejar este campo vacío.",
        password: "Contraseña",
        deletePermanently:
          "Eliminar definitivamente",
        cancel: "Cancelar",
        deleteValidation:
          "Debes escribir ELIMINAR para continuar.",
        deleteFailedTitle:
          "No se pudo eliminar",
        deleteFailedText:
          "Ocurrió un error al eliminar la cuenta.",
        deletedTitle:
          "Cuenta eliminada",
        deletedText:
          "Tu cuenta fue eliminada correctamente.",
        deleteErrorText:
          "No fue posible eliminar la cuenta.",
        language: "Idioma",
        spanish: "Español",
        english: "English",
        supportBadge: "Apoyo voluntario",
        supportTitle: "Apoyar Día en Orden",
        supportDescription:
          "Tu apoyo ayuda a mantener y mejorar la aplicación. Es completamente voluntario y no desbloquea funciones ni contenido adicional.",
        supportButton: "Apoyar",
        supportErrorTitle: "No se pudo abrir el enlace",
        supportErrorText:
          "Intenta nuevamente en unos segundos."
      }
    },

    en: {
      app: {
        personalAgenda: "Personal Planner",
        intelligent: "Smart"
      },

      navigation: {
        home: "Home",
        activities: "Activities",
        calendar: "Calendar",
        movements: "Transactions",
        documents: "Documents",
        account: "My account",
        logout: "Log out"
      },

      home: {
        totalActivities: "Total activities",
        pendingActivities: "Pending activities",
        eventsToday: "Events today",
        scheduledReminders: "Scheduled reminders",
        monthlyExpenses: "Monthly expenses",
        monthlyIncome: "Monthly income",
        estimatedSavings: "Estimated savings",
        eyebrow: "Planner",
        upcomingActivities: "Upcoming activities",
        emptyTitle: "Your planner will appear here",
        emptyText:
          "Your upcoming activities will be shown in this section.",
        activity: "Activity",
        reminder: "Reminder",
        today: "Today",
        tomorrow: "Tomorrow",
        openActivity: "Open activity",
        assistant: "Assistant",
        searchTitle: "What are you looking for?",
        searchPlaceholder: "Search for example: internet",
        searchButton: "Search",
        hello: "Hello",
        user: "User"
      },

      common: {
        preparingDay: "Preparing your day..."
      },
      globalSearch: {
        sessionExpiredTitle: "Session expired",
        sessionExpiredText: "Your session has expired. Please sign in again.",
        activity: "Activity",
        expense: "Expense",
        monthlyIncome: "Monthly income",
        additionalIncome: "Additional income",
        document: "Document",
        result: "Result",
        noResultsTitle: "No results found",
        noResultsText: "Try searching with another word, category, date, or amount.",
        resultsFound: "Results found",
        resultSingular: "result",
        resultPlural: "results",
        noTitle: "Untitled",
        noDescription: "No description",
        searchFailedTitle: "Search failed",
        searchFailedText: "An error occurred while searching.",
        errorTitle: "Error",
        globalSearchFailedText: "The global search could not be completed.",
        personal: "Personal",
        finances: "Finances",
        study: "Study",
        work: "Work",
        health: "Health",
        payments: "Payments",
        other: "Other",
        bill: "Bill",
        food: "Food",
        transportation: "Transportation",
        entertainment: "Entertainment",
        loans: "Loans",
        mainIncome: "Main income",
        personalDocument: "Personal document",
        active: "Active",
        completed: "Completed",
        trash: "Trash"
      },
      activities: {
        sectionTitle: "Your activities",
        loading: "Loading activities",
        badge: "Activities",
        organizeTitle: "Organize your activities",
        organizeText:
          "Create tasks, reminders and alerts with priority, due dates and optional notifications.",
        newActivity: "New activity",
        addManual: "Add activity manually",
        title: "Title",
        titlePlaceholder: "Example: Pay internet bill",
        description: "Description",
        descriptionPlaceholder:
          "Example: Monthly internet service payment",
        priority: "Priority",
        medium: "Medium",
        high: "High",
        low: "Low",
        category: "Category",
        personal: "Personal",
        health: "Health",
        work: "Work",
        finance: "Finance",
        date: "Date",
        dueDate: "Due date",
        reminderTime: "Reminder time",
        repeat: "Repeat",
        once: "Once",
        daily: "Daily",
        weekly: "Weekly",
        monthly: "Monthly",
        yearly: "Yearly",
        saveActivity: "Save activity",
        myActivities: "My activities",
        searchPlaceholder:
          "Search by title, description, category or priority...",
        noDescription: "No additional description.",
        noTime: "No time set",
        reminder: "Reminder",
        trash: "Trash",
        edit: "Edit",
        delete: "Delete",
        editActivity: "Edit activity",
        reminderNotFound: "Reminder not found",
        reminderNotFoundEdit:
          "The reminder to edit could not be found.",
        descriptionOptional:
          "Add an optional description",
        reminderDate: "Reminder date",
        study: "Study",
        payments: "Payments",
        other: "Other",
        status: "Status",
        active: "Active",
        completed: "Completed",
        overdue: "Overdue",
        today: "Today",
        saveChanges: "Save changes",
        cancel: "Cancel",
        allDates: "All dates",
        allPriorities: "All",
        allStatuses: "All",
        taskListening: "Listening...",
        taskCreateByVoice: "Create by voice",
        taskVoicePrompt: "Say the task you want to create",
        voiceQuestion: "What would you like me to remind you about?",
        voicePrompt: "Tap the microphone to start speaking.",
        restore: "Restore",
        complete: "Complete",
        detectedReminder: "Reminder detected",
        notDetected: "Not detected",
        time: "Time",
        updateFailedTitle: "Could not update",
        updateFailedText: "The activity could not be updated.",
        completeNotFoundText:
          "The activity to complete could not be found.",
        completeFailedTitle: "Could not complete",
        completeFailedText:
          "The activity could not be completed.",
        completeErrorText:
          "An error occurred while completing the activity.",
        saveFailedTitle: "Could not save",
        saveFailedText:
          "The activity could not be saved.",
        exactAlertsTitle: "Allow exact reminders",
        exactAlertsText:
          "To notify you exactly at the scheduled time, Día en Orden needs permission to use alarms and reminders.",
        goToSettings: "Go to settings",
        notNow: "Not now",
        listening:
          "Listening... say your complete reminder.",
        couldNotListen: "Could not listen",
        noTextDetected: "No speech was detected.",
        microphoneUnavailable:
          "The microphone could not be used.",
        voiceError: "Voice error",
        microphoneError:
          "The phone microphone could not be used.",
        microphoneUnsupported:
          "Microphone not supported",
        microphoneUnsupportedText:
          "Your browser does not support speech recognition. Try Google Chrome.",
        microphoneStartFailed:
          "Could not start the microphone",
        tryAgain: "Try again.",
        microphonePermissionError:
          "Check the microphone permission or try again.",
        voiceNativePrompt:
          "Say the reminder you want to create",
        thisWeek: "This week",
        thisMonth: "This month",
        overduePlural: "Overdue",
        deleted: "Deleted",
        noDeletedTitle: "No deleted activities",
        noDeletedText:
          "No deleted activities matched the selected filters.",
        noOverdueTitle: "No overdue activities",
        noOverdueText:
          "No overdue activities matched the selected filters.",
        noTodayTitle: "No activities for today",
        noTodayText:
          "No activities for today matched the selected filters.",
        noWeekTitle: "No activities this week",
        noWeekText:
          "No activities for this week matched the selected filters.",
        noMonthTitle: "No activities this month",
        noMonthText:
          "No activities for this month matched the selected filters.",
        noHighTitle:
          "No high-priority activities",
        noHighText:
          "No high-priority activities matched the selected filters.",
        noMediumTitle:
          "No medium-priority activities",
        noMediumText:
          "No medium-priority activities matched the selected filters.",
        noLowTitle:
          "No low-priority activities",
        noLowText:
          "No low-priority activities matched the selected filters.",
        noActivitiesTitle:
          "No activities to display",
        noActivitiesText:
          "When you add an activity, it will appear here.",
        updatedTitle: "Activity updated",
        updatedText: "Your changes were saved successfully.",
        editErrorText: "An error occurred while editing the activity.",
        deleteActivityTitle: "Delete activity?",
        deleteActivityText:
          "The activity will be moved to Deleted, where you can restore it while it remains there.",
        deleteFailedTitle: "Could not delete",
        deleteFailedText: "The activity could not be deleted.",
        ok: "OK",
        deletedTitle: "Activity deleted",
        movedToDeletedSuffix: "was moved to Deleted.",
        movedToDeletedText: "The activity was moved to Deleted.",
        deleteErrorText: "An error occurred while deleting the activity.",
        restoreNotFoundText:
          "The activity to restore could not be found.",
        restoreFailedTitle: "Could not restore",
        restoreFailedText: "The activity could not be restored.",
        restoreErrorText: "An error occurred while restoring the activity.",
        deletePermanentlyTitle: "Delete permanently?",
        deletePermanentlyText:
          "This activity will be permanently deleted and cannot be recovered.",
        deletePermanentlyFailedText:
          "The activity could not be permanently deleted.",
        deletedPermanentlySuffix: "was permanently deleted.",
        deletedPermanentlyText:
          "The activity was permanently deleted.",
        deletePermanentlyErrorText:
          "An error occurred while permanently deleting the activity.",
        emptyDeletedTitle: "Empty deleted activities?",
        deletePermanentlyPrefix: "Permanently delete",
        activitySingular: "activity",
        activityPlural: "activities",
        empty: "Empty",
        emptyDeletedButton: "Empty deleted items",
        emptyFailedTitle: "Could not empty",
        emptyFailedText: "The deleted activities could not be removed.",
        oneDeletedPermanently:
          "1 activity was permanently deleted.",
        manyDeletedPermanentlyPrefix:
          "Permanently deleted",
        manyDeletedPermanentlySuffix:
          "activities.",
        emptyDeletedErrorText:
          "An error occurred while emptying deleted activities."
      },
      movements: {
        sectionTitle: "Transactions",
        personalFinanceControl: "Personal finance control",
        organizeExpenses: "Organize your expenses simply",
        organizeExpensesText:
          "Track bills, daily payments and monthly purchases to better understand where your money is going.",
        backHome: "Back to Home",
        addExpense: "Add expense",
        bills: "Bills",
        servicesPayments: "Services and payments",
        dailyExpenses: "Daily expenses",
        monthlyControl: "Monthly tracking",
        monthlyTotal: "Monthly total",
        registeredExpenses: "Recorded expenses",
        highestExpense: "Highest expense",
        workingMonth: "Working month",
        workingMonthText:
          "Select the month you want to review before adding, checking or analyzing your transactions.",
        month: "Month",
        filterMovements: "Filter transactions",
        all: "All",
        income: "Income",
        expenses: "Expenses",
        addExpenseTitle: "Add expense",
        addExpenseText:
          "Add expenses manually or use voice input.",
        hide: "Hide",
        voiceExpense: "Add expense by voice",
        expenseDate: "Expense date",
        category: "Category",
        selectCategory: "Select a category",
        bill: "Bill",
        food: "Food",
        transportation: "Transportation",
        health: "Health",
        entertainment: "Entertainment",
        loans: "Loans",
        other: "Other",
        description: "Description",
        descriptionPlaceholder:
          "Example: Utility bill, groceries, daily transportation...",
        downloadReport: "Download report",
        newMovement: "New transaction",
        whatAdd: "What would you like to add?",
        close: "Close",
        addExpenseOption: "Add expense",
        expenseOptionText: "Record a purchase or payment",
        addIncome: "Add income",
        incomeOptionText: "Record money received",
        backOptions: "Back to options",
        addMovement: "Add transaction",
        noIncomeTitle: "No income for this month",
        noIncomeText:
          "When you add income, it will appear in this section.",
        noMovementsTitle: "No transactions for this month",
        noMovementsText:
          "When you add income or an expense, it will appear in this section.",
        useToday: "Use today's date",
        changeDate: "Change date",
        loading: "Loading your transactions",
        photoOf: "Photo of",
        initialsOf: "Initials of",
        user: "user",
        date: "Date",
        source: "Source",
        evidence: "Evidence",
        noEvidence: "No evidence",
        view: "View",
        edit: "Edit",
        delete: "Delete",
        type: "Type",
        value: "Amount",
        incomeLabel: "Income",
        updateIncome: "Update income",
        manual: "Manual",
        voice: "By voice",
        viewerUnavailableTitle: "Viewer unavailable",
        viewerUnavailableText:
          "The native file viewer could not be found in the app.",
        pdfOpenFailedTitle: "Could not open PDF",
        pdfOpenFailedText:
          "The file was received, but it could not be opened with the phone viewer.",
        selectedMonth: "Selected month",
        additionalIncomeSummary: "Additional income",
        estimatedSavings: "Estimated savings",
        mainIncome: "Main income",
        monthlyIncomeValue: "Monthly income amount",
        saveMainIncome: "Save main income",
        additionalIncomeTitle: "Additional income",
        incomeDate: "Date",
        incomeDescription: "Description",
        incomeDescriptionPlaceholder: "Example: Freelance, sale, bonus...",
        incomeValue: "Amount",
        addAdditionalIncome: "Add additional income",
        addIncomeShort: "Add income",
        registeredAdditionalIncomes: "Recorded additional income",
        noAdditionalIncomes:
          "No additional income has been recorded for this month.",
        sessionExpiredTitle: "Session expired",
        expenseUpdatedTitle: "Expense updated",
        expenseRegisteredTitle: "Expense recorded",
        expenseUpdatedText:
          "The expense information was updated successfully.",
        expenseRegisteredText: "The expense was saved successfully.",
        fileNotAllowedTitle: "File not allowed",
        fileNotAllowedText:
          "Evidence must be a PDF, JPG, PNG or WEBP file.",
        fileTooLargeTitle: "File too large",
        fileTooLargeText: "Evidence cannot exceed 5 MB.",
        evidenceUnavailableTitle: "Evidence unavailable",
        expenseEvidenceTitle: "Expense evidence",
        back: "Back",
        genericErrorTitle: "Error",
        evidenceOpenErrorText:
          "An error occurred while opening the evidence.",
        deleteFailedTitle: "Could not delete",
        genericErrorText: "An error occurred.",
        expenseDeletedTitle: "Expense deleted",
        expenseDeletedText:
          "The expense was deleted successfully.",
        expenseDeleteErrorText:
          "An error occurred while deleting the expense.",
        updateExpense: "Update expense",
        saveExpense: "Save expense",
        expenseNotFoundEdit:
          "The expense to edit could not be found.",
        voiceUnavailableTitle: "Voice unavailable",
        nativeVoiceUnavailableText:
          "Native voice configuration could not be found.",
        couldNotListenTitle: "Could not listen",
        noTextDetectedText: "No text was detected.",
        voiceErrorTitle: "Voice error",
        voiceMicrophoneErrorText:
          "The phone microphone could not be used.",
        speechUnavailableTitle:
          "Voice recognition unavailable",
        speechUnavailableText:
          "Your browser does not support voice input on this page. Try Chrome.",
        noVoiceTitle: "No voice detected",
        noVoiceText:
          "I couldn't hear any text. Please try again.",
        microphoneCheckText:
          "Check microphone permission or try speaking closer to the device.",
        editingExpenseTitle: "You are editing an expense",
        editingExpenseText:
          "Finish or cancel the edit before automatically saving a voice expense.",
        amountNotDetectedTitle: "Amount not detected",
        expenseAmountNotDetectedText:
          "I couldn't identify the expense amount. Review the form and save it manually.",
        saveFailedTitle: "Could not save",
        voiceExpenseSaveFailedText:
          "The voice expense could not be saved.",
        expenseAutoSavedTitle:
          "Expense saved automatically",
        expenseAutoSavedSuffix:
          "was recorded successfully.",
        voiceExpenseSaveErrorText:
          "An error occurred while saving the voice expense.",
        noDataExportTitle: "No data to export",
        noDataExportText:
          "There is no income or expense data for the selected month.",
        excelGeneratedTitle: "Excel generated",
        excelGeneratedText:
          "The monthly report was downloaded successfully.",
        exportFailedTitle: "Could not export",
        exportFailedText:
          "The report was generated, but it could not be saved or shared on the phone.",
        invalidIncomeTitle: "Invalid income",
        invalidIncomeText:
          "Enter a valid amount for the monthly income.",
        incomeSaveErrorText:
          "An error occurred while saving the income.",
        incomeSavedTitle: "Income saved",
        incomeSavedText:
          "The monthly income was saved successfully.",
        monthlyIncomeSaveErrorText:
          "An error occurred while saving the monthly income.",
        incomeVoiceMobileOnlyText:
          "Income voice input is available in the mobile app.",
        incomeAmountNotDetectedText:
          "Review the income and enter the amount manually.",
        incompleteDataTitle: "Incomplete information",
        incompleteAdditionalIncomeText:
          "Complete the date, description and amount for the additional income.",
        updateFailedTitle: "Could not update",
        additionalIncomeProcessErrorText:
          "An error occurred while processing the additional income.",
        additionalIncomeUpdatedTitle:
          "Additional income updated",
        additionalIncomeSavedTitle:
          "Additional income saved",
        additionalIncomeUpdatedText:
          "The additional income was updated successfully.",
        additionalIncomeSavedText:
          "The additional income was recorded successfully.",
        additionalIncomeDeleteErrorText:
          "An error occurred while deleting the additional income.",
        listening: "Listening...",
        dictateExpenseVoice: "Add expense by voice",
        expenseVoicePrompt: "Say the expense you want to record",
        dictateIncomeVoice: "Add income by voice",
        incomeVoicePrompt: "Say the income you want to record",
        reportMonth: "Month",
        reportIncomeSection: "INCOME",
        reportExpensesBalanceSection: "EXPENSES AND BALANCE",
        reportMonthlyIncome: "Monthly income",
        reportTotalExpenses: "Total expenses",
        reportOtherIncome: "Other income",
        reportBalanceSavings: "Balance / savings",
        reportTotalIncome: "Total income",
        reportMonthlyMovements: "Transactions this month",
        reportMonthlyIncomeDetail: "MONTHLY INCOME DETAILS",
        reportNoDescription: "No description recorded",
        reportType: "Type",
        reportDateMonth: "Date / Month",
        reportDescription: "Description",
        reportAmount: "Amount",
        reportSource: "Source",
        reportAdditional: "Additional",
        reportIncomeSheet: "Income",
        reportDate: "Date",
        reportCategory: "Category",
        reportEvidence: "Evidence",
        reportRegistrationDate: "Date recorded",
        reportExpensesSheet: "Expenses",
        reportSavings: "Savings",
        reportMonthlySummary: "Monthly summary",
        voiceExpenseDefaultDescription: "Voice-recorded expense",
        voiceIncomeDefaultDescription: "Voice-recorded income",
        shareReportTitle: "Monthly report - Día en Orden",
        shareReportPrefix: "Día en Orden financial report for",
        expenseEvidenceOptional: "Optional evidence",
        selectEvidenceFile: "Select file",
        noEvidenceFileSelected: "No file selected",
        evidenceFileHelp: "You can attach a PDF, JPG, PNG or WEBP file. Maximum 5 MB. Optional.",
        expenseAmountPlaceholder: "Example: 51000",
        mainIncomeAmountPlaceholder: "Example: 3000000",
        additionalIncomeAmountPlaceholder: "Example: 300000",
        mainIncomeDescriptionPlaceholder: "Example: Monthly salary, payroll payment...",
        monthlyIncomeSummaryLabel: "Monthly income",
        actions: "Actions",
        reportTitle: "MONTHLY REPORT - DÍA EN ORDEN",
        reportIncomeTitle: "INCOME - DÍA EN ORDEN",
        reportExpensesTitle: "EXPENSES - DÍA EN ORDEN",
        shareReportDialogTitle: "Save or share report",
        dayLabel: "Day",
        evidencePreviewUnavailable: "This file type cannot be previewed directly in the app.",
        openFile: "Open file"
      },
      documents: {
        sectionTitle: "Documents",
        personalSpace: "Personal space",
        heroTitle: "Your important documents, always available",
        heroText: "Save, view and share your personal files from one place.",
        addDocument: "Add document",
        searchPlaceholder: "Search documents",
        oneDocument: "1 document",
        documentsSuffix: "documents",
        loading: "Loading documents...",
        personalDocument: "Personal document",
        close: "Close",
        documentName: "Document name",
        documentNamePlaceholder: "Example: ID card",
        file: "File",
        selectFile: "Select file",
        fileHelp: "PDF, JPG, PNG or WEBP · maximum 5 MB",
        noFileSelected: "No file selected",
        cancel: "Cancel",
        save: "Save",
        editDocument: "Edit document",
        currentFile: "Current file",
        savedDocument: "Saved document",
        keepCurrentFile: "Keep current file",
        sessionExpired: "Session expired",
        loadFailedText: "Documents could not be retrieved.",
        loadErrorTitle: "We couldn't load your documents",
        loadErrorText: "Check your connection and try again.",
        noMatchesTitle: "No matches found",
        noDocumentsTitle: "You don't have any documents yet",
        tryAnotherName: "Try another name.",
        addFirstDocument: "Add your first personal document.",
        unnamedDocument: "Unnamed document",
        view: "View",
        viewDocument: "View document",
        download: "Download",
        downloadDocument: "Download document",
        share: "Share",
        shareDocument: "Share document",
        edit: "Edit",
        editDocumentAction: "Edit document",
        delete: "Delete",
        deleteDocumentAction: "Delete document",
        fileNotAllowedTitle: "File not allowed",
        fileNotAllowedText: "You can only upload PDF, JPG, PNG or WEBP files.",
        fileTooLargeTitle: "File too large",
        fileTooLargeText: "The document cannot exceed 5 MB.",
        enterDocumentName: "Enter the document name.",
        selectAFile: "Select a file.",
        saving: "Saving",
        saveFailedText: "The document could not be saved.",
        updatedTitle: "Document updated",
        savedTitle: "Document saved",
        updatedText: "The document was updated successfully.",
        savedText: "The document was saved successfully.",
        openFailedTitle: "Could not open",
        downloadFailedTitle: "Could not download",
        sharedFromDanybot: "Document shared from DANYBOT",
        shareFromWebTitle: "Share from the web",
        shareFromWebText: "Your browser cannot share files directly. You can download the file and attach it manually.",
        shareFailedTitle: "Could not share",
        shareFailedText: "The document could not be shared.",
        deleteTitle: "Delete document",
        deletePrefix: "This will delete",
        deleteFailedText: "The document could not be deleted.",
        deletedTitle: "Document deleted",
        deletedText: "The document was deleted successfully.",
        nativeConversionFailed: "The document could not be converted.",
        nativeReadFailed: "The document could not be read.",
        nativeInvalidDocument: "The received document is empty or invalid.",
        nativeLocationFailed: "The document location could not be obtained.",
        nativePluginsMissing: "The required plugins to open the document were not found.",
        nativeTemporaryLocationFailed: "The temporary document location could not be obtained.",
        nativeSavedTextSuffix: "was saved in the Documentos/DANYBOT folder.",
        nativeShareOnlyMobile: "Sharing is only available in the mobile app.",
        nativeShareMenuMissing: "The native share menu could not be found.",
        nativeShareUnsupported: "This device does not support file sharing.",
        nativeShareTitle: "DANYBOT Document",
        nativeShareText: "Document shared from DANYBOT.",
        pageTitle: "My documents",
        retrieveFileFailedText: "The file could not be retrieved.",
        deleteFailedTitle: "Could not delete",
        nativeFileSystemMissing: "The native file system could not be found.",
        nativeViewerOnlyMobile: "The native viewer is only available in the mobile app.",
        nativeDownloadOnlyMobile: "Native download is only available in the mobile app.",
        avatar: "Avatar"
      },

      login: {
        pageTitle: "Día en Orden | Sign in",
        language: "Language",
        visualTitle: "Organize your day from one place",
        visualText: "Manage tasks, expenses, reminders and your calendar with a simple, beautiful and personal experience.",
        tasks: "Tasks",
        tasksText: "Prioritize your day",
        expenses: "Expenses",
        expensesText: "Keep your month under control",
        agenda: "Planner",
        agendaText: "Don't forget anything",
        welcomeBack: "Welcome back",
        continueLineOne: "Sign in to continue",
        continueLineTwo: "and organize your day better.",
        continueWithEmail: "or continue with your email",
        email: "Email",
        emailPlaceholder: "Enter your email",
        password: "Password",
        passwordPlaceholder: "Enter your password",
        togglePassword: "Show or hide password",
        signIn: "Sign in",
        fingerprintSignIn: "Sign in with fingerprint",
        forgotPassword: "Forgot your password?",
        noAccount: "Don't have an account?",
        createFreeAccount: "Create a free account",
        accessCorrect: "Signed in successfully. The chatbot will load here...",
        incompleteTitle: "Incomplete information",
        enterEmailPassword: "Enter your email and password.",
        loginFailedTitle: "Could not sign in",
        invalidCredentials: "Incorrect email or password.",
        welcomeTitle: "Welcome",
        hello: "Hello",
        loginSuccessSuffix: "you signed in successfully.",
        passwordResetTitle: "Reset password",
        passwordResetText: "Enter the email registered to your account.",
        sendCode: "Send code",
        cancel: "Cancel",
        enterEmail: "Enter your email.",
        codeSentTitle: "Code sent",
        codeSentText: "We sent a recovery code to:",
        verificationCode: "Verification code",
        newPassword: "New password",
        confirmNewPassword: "Confirm new password",
        changePassword: "Change password",
        completeResetData: "Enter the code and your new password.",
        passwordMinLength: "The password must be at least 6 characters long.",
        passwordMismatch: "The passwords do not match.",
        passwordUpdatedTitle: "Password updated",
        passwordUpdatedText: "You can now sign in with your new password.",
        passwordResetFailed: "Could not change the password.",
        googleNoCredential: "Google did not return a valid credential.",
        googleLoginProblem: "There was a problem signing in with Google.",
        googleUnavailableTitle: "Google unavailable",
        googleUnavailableText: "Native Google sign-in is not available on this device.",
        connectingGoogle: "Connecting to Google...",
        googlePluginUnavailable: "The SocialLogin plugin is unavailable.",
        googleInvalidToken: "Google did not return a valid idToken.",
        googleValidationError: "An error occurred while validating your Google account.",
        googleErrorTitle: "Google error",
        googleErrorText: "Could not sign in with Google.",
        continueGoogle: "Continue with Google",
        biometricUnavailable: "Biometrics are unavailable.",
        biometricPluginUnavailable: "BiometricAuth is unavailable.",
        biometricReason: "Confirm your identity to access DANYBOT",
        biometricAndroidTitle: "Access DANYBOT",
        biometricAndroidSubtitle: "Use your fingerprint to continue",
        biometricActivateTitle: "Enable fingerprint access?",
        biometricActivateText: "Next time you can sign in to DANYBOT using this device's fingerprint.",
        biometricActivateButton: "Enable fingerprint",
        notNow: "Not now",
        biometricActivatedTitle: "Fingerprint enabled",
        biometricActivatedText: "You can now sign in to DANYBOT with your fingerprint.",
        biometricAccessUnavailableTitle: "Biometric access unavailable",
        biometricAccessUnavailableText: "Sign in again with your email or Google.",
        sessionExpiredTitle: "Session expired",
        sessionExpiredText: "For security, sign in again. You can use your fingerprint again afterward."
      },
      signup: {
        pageTitle: "Día en Orden | Create account",
        kicker: "Create account",
        title: "Join Día en Orden",
        intro: "Enter your information to start organizing your day in a simple and practical way. We will verify your email with a code before creating your account.",
        name: "Name",
        namePlaceholder: "Enter your name",
        email: "Email",
        emailPlaceholder: "Enter your email",
        birthDate: "Date of birth",
        phone: "Phone number",
        password: "Password",
        confirmPassword: "Confirm password",
        confirmPasswordPlaceholder: "Enter your password",
        togglePassword: "Show or hide password",
        toggleConfirmPassword: "Show or hide password confirmation",
        cancel: "Cancel",
        createAccount: "Create account",
        sendingCode: "Sending code...",
        alreadyAccount: "Already have an account?",
        signIn: "Sign in",
        verificationSendFailed: "Could not send the verification code.",
        verificationFailed: "Could not verify the code.",
        verifyEmailTitle: "Verify your email",
        verificationSentText: "We sent a verification code to:",
        checkInboxText: "Check your inbox or spam folder.",
        verificationCode: "Verification code",
        verificationPlaceholder: "Example: 123456",
        verifyCreateAccount: "Verify and create account",
        enterVerificationCode: "Enter the code sent to your email.",
        passwordsDifferentTitle: "Passwords do not match",
        passwordsMismatch: "The passwords do not match.",
        accountCreatedTitle: "Account created",
        accountCreatedText: "Your account was created and your email was successfully verified.",
        accountCreateFailedTitle: "Could not create account",
        accountCreateFailedText: "An error occurred while creating your account."
      },
      account: {
        title: "My account",
        accountInfo: "Account information",
        name: "Name",
        email: "Email",
        userId: "User ID",
        notRegistered: "Not provided",
        noEmail: "No email registered",
        session: "Session",
        logout: "Log out",
        logoutDescription:
          "Sign out of your current account to use another user.",
        deleteAccount: "Delete account",
        sessionNotFoundTitle: "Session not found",
        sessionNotFoundText:
          "The current user could not be identified.",
        deleteAccountTitle: "Delete account",
        deletePermanentWarning:
          "This action will permanently delete your account and all your data.",
        deleteConfirmInstruction:
          "To confirm, type:",
        deleteConfirmPlaceholder:
          "Type ELIMINAR",
        deletePasswordHelp:
          "If your account was created with a password, enter it as well. If you signed up with Google, you can leave this field empty.",
        password: "Password",
        deletePermanently:
          "Delete permanently",
        cancel: "Cancel",
        deleteValidation:
          "You must type ELIMINAR to continue.",
        deleteFailedTitle:
          "Account could not be deleted",
        deleteFailedText:
          "An error occurred while deleting your account.",
        deletedTitle:
          "Account deleted",
        deletedText:
          "Your account was deleted successfully.",
        deleteErrorText:
          "Your account could not be deleted.",
        deletePermanentWarningEnMarker: true,
        language: "Language",
        spanish: "Español",
        english: "English",
        supportBadge: "Voluntary support",
        supportTitle: "Support Día en Orden",
        supportDescription:
          "Your support helps maintain and improve the app. It is completely voluntary and does not unlock features or additional content.",
        supportButton: "Support",
        supportErrorTitle: "Could not open the link",
        supportErrorText:
          "Please try again in a few seconds."
      }
    }
  };

  function normalizeLanguage(language) {
    return language === "en"
      ? "en"
      : DEFAULT_LANGUAGE;
  }

  function getLanguage() {
    return normalizeLanguage(
      localStorage.getItem(STORAGE_KEY)
    );
  }

  function setDocumentLanguage(language) {
    document.documentElement.lang =
      language === "en"
        ? "en"
        : "es-419";
  }

  function setLanguage(language) {
    const normalizedLanguage =
      normalizeLanguage(language);

    localStorage.setItem(
      STORAGE_KEY,
      normalizedLanguage
    );

    setDocumentLanguage(
      normalizedLanguage
    );

    applyTranslations(document);

    document.dispatchEvent(
      new CustomEvent(
        "danybot:language-changed",
        {
          detail: {
            language: normalizedLanguage
          }
        }
      )
    );

    return normalizedLanguage;
  }

  function getTranslationValue(
    language,
    key
  ) {
    return key
      .split(".")
      .reduce(
        (currentValue, part) =>
          currentValue &&
          currentValue[part] !== undefined
            ? currentValue[part]
            : undefined,
        translations[language]
      );
  }

  function t(key) {
    const language =
      getLanguage();

    const translatedValue =
      getTranslationValue(
        language,
        key
      );

    if (translatedValue !== undefined) {
      return translatedValue;
    }

    const fallbackValue =
      getTranslationValue(
        DEFAULT_LANGUAGE,
        key
      );

    if (fallbackValue !== undefined) {
      return fallbackValue;
    }

    console.warn(
      `i18n: traducción no encontrada para "${key}".`
    );

    return key;
  }

  function applyTranslations(root = document) {
    if (!root) {
      return;
    }

    root
      .querySelectorAll("[data-i18n]")
      .forEach((element) => {
        const key =
          element.getAttribute(
            "data-i18n"
          );

        if (key) {
          element.textContent = t(key);
        }
      });

    root
      .querySelectorAll(
        "[data-i18n-placeholder]"
      )
      .forEach((element) => {
        const key =
          element.getAttribute(
            "data-i18n-placeholder"
          );

        if (key) {
          element.setAttribute(
            "placeholder",
            t(key)
          );
        }
      });

    root
      .querySelectorAll(
        "[data-i18n-aria-label]"
      )
      .forEach((element) => {
        const key =
          element.getAttribute(
            "data-i18n-aria-label"
          );

        if (key) {
          element.setAttribute(
            "aria-label",
            t(key)
          );
        }
      });
  }

  setDocumentLanguage(
    getLanguage()
  );

  applyTranslations(document);

  window.DANYBOT_I18N = {
    t,
    getLanguage,
    setLanguage,
    applyTranslations,
    translations,
    supportedLanguages: [
      "es",
      "en"
    ]
  };
})();