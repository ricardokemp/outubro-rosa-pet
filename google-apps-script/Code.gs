/**
 * OUTUBRO ROSA PET - MURAL DIGITAL
 * Google Apps Script
 *
 * Este script recebe o formulário do site, salva a foto no Google Drive,
 * registra os dados no Google Sheets e fornece uma leitura pública do mural.
 *
 * IMPORTANTE:
 * - Publique como Web App.
 * - Execute como: você.
 * - Quem tem acesso: qualquer pessoa.
 * - Informe os IDs abaixo antes de publicar.
 */

const CONFIG = {
  SPREADSHEET_ID: 'COLE_AQUI_O_ID_DA_PLANILHA',
  FOLDER_ID: 'COLE_AQUI_O_ID_DA_PASTA_DO_DRIVE',
  SHEET_NAME: 'Mural',
  MAX_FILE_BYTES: 8 * 1024 * 1024
};

function setup() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEET_NAME);

  const headers = [
    'DATA', 'NOME', 'PET', 'TIPO', 'MENSAGEM',
    'ARQUIVO', 'FILE_ID', 'FOTO_URL', 'PUBLICAR', 'CONSENTIMENTO'
  ];

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  return 'Configuração inicial concluída.';
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  if (params.action === 'list') return listPublicMural_(params.callback);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'Outubro Rosa Pet Mural' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    validatePayload_(payload);

    const folder = DriveApp.getFolderById(CONFIG.FOLDER_ID);
    const bytes = Utilities.base64Decode(payload.base64);

    if (bytes.length > CONFIG.MAX_FILE_BYTES) {
      throw new Error('Arquivo maior que o limite permitido.');
    }

    const safeName = sanitizeFileName_(payload.fileName || 'foto-pet');
    const blob = Utilities.newBlob(bytes, payload.mimeType || 'image/jpeg', safeName);
    const file = folder.createFile(blob);

    // O mural precisa conseguir carregar a imagem sem login.
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const photoUrl = `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w1200`;
    const sheet = getSheet_();

    sheet.appendRow([
      new Date(),
      payload.nome,
      payload.pet,
      payload.tipo,
      payload.mensagem,
      safeName,
      file.getId(),
      photoUrl,
      'NÃO',
      'SIM'
    ]);

    return jsonResponse_({ ok: true, message: 'Participação recebida.' });
  } catch (error) {
    return jsonResponse_({ ok: false, error: error.message || String(error) });
  }
}

function parsePayload_(e) {
  if (!e || !e.parameter) throw new Error('Dados não recebidos.');

  let raw = e.parameter.payload;
  if (!raw && e.postData && e.postData.contents) raw = e.postData.contents;
  if (!raw) throw new Error('Payload vazio.');

  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function validatePayload_(p) {
  if (!p.nome || p.nome.length < 2) throw new Error('Nome inválido.');
  if (!p.pet || p.pet.length < 1) throw new Error('Nome do pet é obrigatório.');
  if (!p.tipo) throw new Error('Tipo do pet é obrigatório.');
  if (!p.mensagem || p.mensagem.length < 3) throw new Error('Mensagem inválida.');
  if (p.mensagem.length > 250) throw new Error('Mensagem acima de 250 caracteres.');
  if (!p.base64) throw new Error('Foto não recebida.');
  if (!p.consentimento) throw new Error('Autorização não informada.');
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    setup();
    sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  }
  return sheet;
}

function listPublicMural_(callback) {
  try {
    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return jsonOrJsonp_({ ok: true, items: [] }, callback);

    const headers = values[0].map(String);
    const index = key => headers.indexOf(key);

    const items = values.slice(1)
      .filter(row => String(row[index('PUBLICAR')]).trim().toUpperCase() === 'SIM')
      .map(row => ({
        nome: String(row[index('NOME')] || ''),
        pet: String(row[index('PET')] || ''),
        tipo: String(row[index('TIPO')] || ''),
        mensagem: String(row[index('MENSAGEM')] || ''),
        foto: String(row[index('FOTO_URL')] || '')
      }))
      .filter(item => item.foto);

    return jsonOrJsonp_({ ok: true, items }, callback);
  } catch (error) {
    return jsonOrJsonp_({ ok: false, error: error.message || String(error) }, callback);
  }
}

function jsonOrJsonp_(data, callback) {
  const json = JSON.stringify(data);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService
      .createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizeFileName_(name) {
  return String(name)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120) || `foto_${Date.now()}.jpg`;
}
