/*******************************************************
 * OUTUBRO ROSA PET
 * BACKEND DO MURAL DIGITAL
 *
 * Google Apps Script
 *
 * Funções principais:
 *  - Receber participações do site
 *  - Salvar fotos no Google Drive
 *  - Registrar dados no Google Planilhas
 *  - Moderar publicações
 *  - Fornecer dados públicos para o mural
 *******************************************************/


/* =====================================================
   CONFIGURAÇÃO
   ===================================================== */

const CONFIG = {

  // ID da sua planilha
  SPREADSHEET_ID:
    '1030k6mzCln8sjxSbtx-frGu8nDRhmubOnP-1IP1lJBM',

  // ID da pasta onde as fotos serão armazenadas
  FOLDER_ID:
    '1QnMTu3jA7cXhdMX9JStaf1hv6-zfpV6j',

  // Nome da aba utilizada pelo mural
  SHEET_NAME: 'Mural',

  // Tamanho máximo da imagem
  // 8 MB
  MAX_FILE_BYTES: 8 * 1024 * 1024,

  // Tipos de imagem aceitos
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ],

  // Extensões aceitas
  ALLOWED_EXTENSIONS: [
    'jpg',
    'jpeg',
    'png',
    'webp'
  ]

};


/* =====================================================
   CABEÇALHOS DA PLANILHA
   ===================================================== */

const HEADERS = [
  'DATA',
  'NOME',
  'PET',
  'TIPO',
  'MENSAGEM',
  'ARQUIVO',
  'FILE_ID',
  'FOTO_URL',
  'PUBLICAR',
  'CONSENTIMENTO'
];


/* =====================================================
   SETUP INICIAL
   ===================================================== */

/**
 * Executar esta função UMA VEZ manualmente
 * no editor do Google Apps Script.
 *
 * Ela:
 * - abre a planilha
 * - cria a aba Mural caso não exista
 * - cria os cabeçalhos
 * - configura a primeira linha
 */
function setup() {

  const spreadsheet = SpreadsheetApp.openById(
    CONFIG.SPREADSHEET_ID
  );

  let sheet = spreadsheet.getSheetByName(
    CONFIG.SHEET_NAME
  );

  if (!sheet) {

    sheet = spreadsheet.insertSheet(
      CONFIG.SHEET_NAME
    );

  }

  // Se a planilha estiver vazia
  if (sheet.getLastRow() === 0) {

    sheet
      .getRange(1, 1, 1, HEADERS.length)
      .setValues([HEADERS]);

  } else {

    // Garante que os cabeçalhos estejam corretos
    sheet
      .getRange(1, 1, 1, HEADERS.length)
      .setValues([HEADERS]);

  }

  // Formatação dos cabeçalhos
  const headerRange = sheet.getRange(
    1,
    1,
    1,
    HEADERS.length
  );

  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  // Congela a primeira linha
  sheet.setFrozenRows(1);

  // Ajusta largura das colunas
  sheet.autoResizeColumns(
    1,
    HEADERS.length
  );

  Logger.log(
    'Setup concluído com sucesso.'
  );

  Logger.log(
    'Planilha: ' + spreadsheet.getName()
  );

  Logger.log(
    'Aba: ' + CONFIG.SHEET_NAME
  );

}


/* =====================================================
   GET
   ===================================================== */

/**
 * Endpoint público.
 *
 * Exemplos:
 *
 * /exec
 *
 * /exec?action=list
 *
 * /exec?action=list&callback=nomeDaFuncao
 */
function doGet(e) {

  try {

    const params = e && e.parameter
      ? e.parameter
      : {};

    const action = params.action || 'status';

    if (action === 'list') {

      return listPublicMural_(
        params.callback
      );

    }

    return jsonResponse_({
      success: true,
      service: 'Outubro Rosa Pet',
      status: 'online',
      version: '1.0'
    });

  } catch (error) {

    return jsonResponse_({
      success: false,
      error: error.message
    });

  }

}


/* =====================================================
   POST
   ===================================================== */

/**
 * Recebe os dados enviados pelo site.
 *
 * O site deve enviar um objeto JSON dentro de:
 *
 * e.postData.contents
 *
 * Estrutura esperada:
 *
 * {
 *   nome: "...",
 *   pet: "...",
 *   tipo: "...",
 *   mensagem: "...",
 *   consentimento: true,
 *   foto: {
 *      name: "...",
 *      type: "image/jpeg",
 *      data: "BASE64..."
 *   }
 * }
 */
function doPost(e) {

  try {

    const payload = parsePayload_(e);

    validatePayload_(payload);


    /* -----------------------------------------------
       PLANILHA
       ----------------------------------------------- */

    const sheet = getSheet_();


    /* -----------------------------------------------
       FOTO
       ----------------------------------------------- */

    let file = null;
    let fileId = '';
    let fileUrl = '';
    let fileName = '';


    if (
      payload.foto &&
      payload.foto.data
    ) {

      file = saveImageToDrive_(
        payload.foto,
        payload.nome,
        payload.pet
      );

      fileId = file.getId();
      fileName = file.getName();

      /*
       * URL usada pelo mural.
       *
       * O thumbnail do Google Drive é utilizado
       * para facilitar a exibição das imagens.
       */

      fileUrl =
        'https://drive.google.com/thumbnail?id=' +
        encodeURIComponent(fileId) +
        '&sz=w1200';

    }


    /* -----------------------------------------------
       REGISTRO NA PLANILHA
       ----------------------------------------------- */

    const row = [

      new Date(),

      cleanText_(payload.nome),

      cleanText_(payload.pet),

      cleanText_(payload.tipo),

      cleanMessage_(payload.mensagem),

      fileName,

      fileId,

      fileUrl,

      'NÃO',

      'SIM'

    ];


    sheet.appendRow(row);


    /* -----------------------------------------------
       RESPOSTA
       ----------------------------------------------- */

    return jsonResponse_({

      success: true,

      message:
        'Participação recebida com sucesso!',

      published: false,

      moderation:
        'Sua participação será publicada após aprovação.'

    });


  } catch (error) {

    return jsonResponse_({

      success: false,

      error: error.message

    });

  }

}


/* =====================================================
   PARSE DO PAYLOAD
   ===================================================== */

/**
 * Interpreta os dados enviados pelo site.
 */
function parsePayload_(e) {

  if (!e) {

    throw new Error(
      'Requisição inválida.'
    );

  }


  let payload = null;


  /* -----------------------------------------------
     JSON puro
     ----------------------------------------------- */

  if (
    e.postData &&
    e.postData.contents
  ) {

    const contents =
      e.postData.contents.trim();

    if (contents) {

      try {

        payload =
          JSON.parse(contents);

      } catch (error) {

        // Continua tentando outros formatos

      }

    }

  }


  /* -----------------------------------------------
     Parâmetro payload
     ----------------------------------------------- */

  if (
    !payload &&
    e.parameter &&
    e.parameter.payload
  ) {

    try {

      payload =
        JSON.parse(
          e.parameter.payload
        );

    } catch (error) {

      throw new Error(
        'O campo payload não contém JSON válido.'
      );

    }

  }


  /* -----------------------------------------------
     Parâmetros individuais
     ----------------------------------------------- */

  if (!payload) {

    payload = {

      nome:
        e.parameter.nome || '',

      pet:
        e.parameter.pet || '',

      tipo:
        e.parameter.tipo || '',

      mensagem:
        e.parameter.mensagem || '',

      consentimento:
        e.parameter.consentimento || false

    };

  }


  return payload;

}


/* =====================================================
   VALIDAÇÃO
   ===================================================== */

function validatePayload_(payload) {

  if (!payload) {

    throw new Error(
      'Nenhum dado foi recebido.'
    );

  }


  /* -----------------------------------------------
     Nome
     ----------------------------------------------- */

  if (
    !payload.nome ||
    String(payload.nome).trim().length < 2
  ) {

    throw new Error(
      'Informe seu nome.'
    );

  }


  /* -----------------------------------------------
     Nome do pet
     ----------------------------------------------- */

  if (
    !payload.pet ||
    String(payload.pet).trim().length < 1
  ) {

    throw new Error(
      'Informe o nome do pet.'
    );

  }


  /* -----------------------------------------------
     Tipo
     ----------------------------------------------- */

  const allowedTypes = [
    'Cachorro',
    'Gato',
    'Coelho',
    'Outro'
  ];

  if (
    !allowedTypes.includes(
      String(payload.tipo)
    )
  ) {

    throw new Error(
      'Tipo de animal inválido.'
    );

  }


  /* -----------------------------------------------
     Mensagem
     ----------------------------------------------- */

  if (
    !payload.mensagem ||
    String(payload.mensagem).trim().length < 2
  ) {

    throw new Error(
      'Escreva uma mensagem.'
    );

  }


  if (
    String(payload.mensagem).length > 250
  ) {

    throw new Error(
      'A mensagem deve ter no máximo 250 caracteres.'
    );

  }


  /* -----------------------------------------------
     Consentimento
     ----------------------------------------------- */

  const consentimento =
    payload.consentimento === true ||
    payload.consentimento === 'true' ||
    payload.consentimento === 'SIM' ||
    payload.consentimento === 'sim' ||
    payload.consentimento === 1 ||
    payload.consentimento === '1';


  if (!consentimento) {

    throw new Error(
      'É necessário autorizar a publicação da participação.'
    );

  }


  /* -----------------------------------------------
     Foto
     ----------------------------------------------- */

  if (payload.foto) {

    validateImage_(
      payload.foto
    );

  }

}


/* =====================================================
   VALIDAÇÃO DA IMAGEM
   ===================================================== */

function validateImage_(foto) {

  if (!foto.data) {

    throw new Error(
      'A imagem não contém dados.'
    );

  }


  const mimeType =
    String(
      foto.type || ''
    ).toLowerCase();


  if (
    !CONFIG.ALLOWED_MIME_TYPES.includes(
      mimeType
    )
  ) {

    throw new Error(
      'Formato de imagem não permitido. Use JPG, PNG ou WEBP.'
    );

  }


  const fileName =
    String(
      foto.name || 'foto'
    );


  const extension =
    getExtension_(
      fileName
    );


  if (
    !CONFIG.ALLOWED_EXTENSIONS.includes(
      extension
    )
  ) {

    throw new Error(
      'Extensão de imagem não permitida.'
    );

  }


  /* -----------------------------------------------
     Calcula tamanho aproximado do Base64
     ----------------------------------------------- */

  const base64 =
    String(foto.data)
      .replace(
        /^data:[^;]+;base64,/,
        ''
      );


  const estimatedBytes =
    Math.floor(
      base64.length * 0.75
    );


  if (
    estimatedBytes >
    CONFIG.MAX_FILE_BYTES
  ) {

    throw new Error(
      'A foto ultrapassa o tamanho máximo permitido de 8 MB.'
    );

  }

}


/* =====================================================
   SALVAR FOTO NO GOOGLE DRIVE
   ===================================================== */

function saveImageToDrive_(
  foto,
  nome,
  pet
) {

  const folder =
    DriveApp.getFolderById(
      CONFIG.FOLDER_ID
    );


  let base64 =
    String(foto.data);


  /*
   * Caso venha como:
   *
   * data:image/jpeg;base64,...
   *
   * remove o cabeçalho.
   */

  base64 =
    base64.replace(
      /^data:[^;]+;base64,/,
      ''
    );


  const bytes =
    Utilities.base64Decode(
      base64
    );


  const extension =
    getExtension_(
      foto.name || 'foto.jpg'
    );


  const safeNome =
    sanitizeFileName_(
      nome
    );


  const safePet =
    sanitizeFileName_(
      pet
    );


  const timestamp =
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone() ||
        'America/Sao_Paulo',
      'yyyyMMdd_HHmmss'
    );


  const fileName =
    timestamp +
    '_' +
    safeNome +
    '_' +
    safePet +
    '.' +
    extension;


  const blob =
    Utilities.newBlob(
      bytes,
      foto.type,
      fileName
    );


  const file =
    folder.createFile(
      blob
    );


  /*
   * Permite que a imagem seja visualizada
   * pelo mural público.
   */

  try {

    file.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );

  } catch (sharingError) {

    console.warn(
      'Não foi possível configurar compartilhamento público: ' +
      sharingError.message
    );

  }


  return file;

}


/* =====================================================
   OBTER PLANILHA
   ===================================================== */

function getSheet_() {

  const spreadsheet =
    SpreadsheetApp.openById(
      CONFIG.SPREADSHEET_ID
    );


  let sheet =
    spreadsheet.getSheetByName(
      CONFIG.SHEET_NAME
    );


  if (!sheet) {

    sheet =
      spreadsheet.insertSheet(
        CONFIG.SHEET_NAME
      );

    sheet
      .getRange(
        1,
        1,
        1,
        HEADERS.length
      )
      .setValues([
        HEADERS
      ]);

  }


  return sheet;

}


/* =====================================================
   LISTAR MURAL PÚBLICO
   ===================================================== */

/**
 * Retorna somente as participações aprovadas.
 *
 * A publicação acontece quando:
 *
 * PUBLICAR = SIM
 */
function listPublicMural_(callback) {

  const sheet =
    getSheet_();


  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {

    const emptyData = {
      success: true,
      total: 0,
      items: []
    };


    return jsonResponse_(
      emptyData,
      callback
    );

  }


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        HEADERS.length
      )
      .getValues();


  const items = [];


  values.forEach(function(row) {

    const publicar =
      String(
        row[8] || ''
      )
      .trim()
      .toUpperCase();


    if (
      publicar !== 'SIM'
    ) {

      return;

    }


    const data =
      row[0]
        ? formatDate_(row[0])
        : '';


    items.push({

      data: data,

      nome:
        cleanText_(row[1]),

      pet:
        cleanText_(row[2]),

      tipo:
        cleanText_(row[3]),

      mensagem:
        cleanMessage_(row[4]),

      foto:
        row[7]
          ? String(row[7])
          : ''

    });

  });


  /*
   * Mostra os mais recentes primeiro.
   */

  items.reverse();


  return jsonResponse_({

    success: true,

    total: items.length,

    items: items

  }, callback);

}


/* =====================================================
   RESPOSTA JSON / JSONP
   ===================================================== */

function jsonResponse_(
  data,
  callback
) {

  const json =
    JSON.stringify(
      data
    );


  /*
   * JSONP
   *
   * Útil para a leitura pública do mural
   * quando o site estiver hospedado no GitHub Pages.
   */

  if (callback) {

    /*
     * Evita caracteres perigosos no nome
     * da função callback.
     */

    const safeCallback =
      String(callback)
        .replace(
          /[^a-zA-Z0-9_.$]/g,
          ''
        );


    return ContentService
      .createTextOutput(
        safeCallback +
        '(' +
        json +
        ')'
      )
      .setMimeType(
        ContentService.MimeType.JAVASCRIPT
      );

  }


  return ContentService
    .createTextOutput(
      json
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}


/* =====================================================
   LIMPEZA DE TEXTO
   ===================================================== */

function cleanText_(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return '';

  }


  return String(value)
    .replace(
      /[\u0000-\u001F\u007F]/g,
      ''
    )
    .trim();

}


/* =====================================================
   LIMPEZA DE MENSAGEM
   ===================================================== */

function cleanMessage_(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return '';

  }


  return String(value)
    .replace(
      /[\u0000-\u001F\u007F]/g,
      ''
    )
    .trim()
    .substring(
      0,
      250
    );

}


/* =====================================================
   SANITIZAÇÃO DE NOME DE ARQUIVO
   ===================================================== */

function sanitizeFileName_(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return 'arquivo';

  }


  let text =
    String(value)
      .trim();


  /*
   * Remove acentos
   */

  text =
    text.normalize(
      'NFD'
    )
    .replace(
      /[\u0300-\u036f]/g,
      ''
    );


  /*
   * Remove caracteres problemáticos
   */

  text =
    text.replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    );


  /*
   * Limita tamanho
   */

  text =
    text.substring(
      0,
      40
    );


  return text ||
    'arquivo';

}


/* =====================================================
   EXTENSÃO DO ARQUIVO
   ===================================================== */

function getExtension_(fileName) {

  const name =
    String(
      fileName || ''
    )
    .toLowerCase()
    .trim();


  const parts =
    name.split('.');


  if (
    parts.length < 2
  ) {

    return '';

  }


  return parts[
    parts.length - 1
  ];

}


/* =====================================================
   FORMATAÇÃO DE DATA
   ===================================================== */

function formatDate_(date) {

  if (!date) {

    return '';

  }


  try {

    return Utilities.formatDate(

      new Date(date),

      Session.getScriptTimeZone() ||
        'America/Sao_Paulo',

      'dd/MM/yyyy HH:mm'

    );

  } catch (error) {

    return String(date);

  }

}
