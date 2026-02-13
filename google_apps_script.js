/**
 * Google Apps Script for Biology Activity Integration with AI Correction
 * Spreadsheet ID: 1F1qUYkW9--r8U2eCHvOpruZue-HdQRh9T5HroiE5Rws
 * Sheet Name: "2TEC "
 */

// --- CONFIGURAÇÃO ---
const SPREADSHEET_ID = '1F1qUYkW9--r8U2eCHvOpruZue-HdQRh9T5HroiE5Rws';
const SHEET_NAME = '2TEC ';
const START_ROW = 4;
const NAME_COL = 2; // Column B (1-indexed)
const DATA_START_COL = 22; // Column V (1-indexed)

// COLOQUE SUA CHAVE DE API DO GEMINI AQUI:
// Obtenha em: https://aistudio.google.com/app/apikey
const GEMINI_API_KEY = 'AIzaSyAuxHOaQBhJQPho8fGLe8_ISanpovAciGA';

// GABARITO QUESTÕES OBJETIVAS
const GABARITO_OBJ = ['C', 'A', 'D', 'B', 'C']; // Q1-Q5

// ENUNCIADOS E CRITÉRIOS PARA IA
const RUBRICAS_DISCURSIVAS = {
  6: {
    pergunta: "Amazônia: sumidouro de carbono? Explique como a floresta amazônica atua no equilíbrio climático e por que sua conversão em pastagem acelera o efeito estufa.",
    criterios: "Deve citar o papel da fotossíntese no sequestro de CO2 e a liberação de carbono estocado na biomassa durante queimadas/decomposição. Mencionar a redução da umidade (rios voadores) é um bônus."
  },
  7: {
    pergunta: "Fermentação: pão e cerveja. Compare o rendimento energético (ATP) e os produtos finais da fermentação alcoólica vs respiração aeróbica. Por que a massa cresce?",
    criterios: "Deve mencionar que a respiração produz ~36-38 ATP e CO2+H2O, enquanto a fermentação produz 2 ATP, Etanol e CO2. O crescimento do pão é devido ao CO2 expandindo a massa."
  },
  8: {
    pergunta: "SAF – Síndrome Alcoólica Fetal. Descreva como o etanol afeta o desenvolvimento do SNC do feto e relacione com comprometimentos cognitivos.",
    criterios: "Deve citar que o álcool atravessa a barreira placentária, interfere na migração neuronal e formação do tubo neural, causando danos estruturais permanentes e atrasos cognitivos."
  },
  9: {
    pergunta: "Matriz elétrica brasileira: Etanol de cana. Compare vantagens (CO2, empregos) e impactos ambientais (biodiversidade, eutrofização).",
    criterios: "Deve balancear o balanço positivo de carbono (renovável) com o uso intensivo de terra, monocultura, agrotóxicos e lixiviação de fertilizantes."
  },
  10: {
    pergunta: "Água subterrânea contaminada: Nitrato no aquífero Bauru. Relacione lixiviação, ciclo do nitrogênio e riscos à saúde (metahemoglobinemia).",
    criterios: "Deve explicar que o excesso de fertilizantes nitrogenados é levado pela chuva (lixiviação) até o lençol freático. A metahemoglobinemia impede o transporte de O2 no sangue (bebês azuis)."
  }
};

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const studentName = payload.aluno_nome;
    const answers = payload.respostas_array; // [Q1...Q10]

    // 1. Localizar Aluno
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const lastRow = sheet.getLastRow();
    const names = sheet.getRange(START_ROW, NAME_COL, lastRow - START_ROW + 1, 1).getValues();

    let targetRow = -1;
    for (let i = 0; i < names.length; i++) {
      if (names[i][0].toString().trim().toUpperCase() === studentName.trim().toUpperCase()) {
        targetRow = START_ROW + i;
        break;
      }
    }

    if (targetRow === -1) throw new Error('Aluno não encontrado na lista.');

    // 2. Corrigir Objetivas (Q1-Q5)
    let acertosObj = 0;
    let correcaoObjStr = "";
    for (let i = 0; i < 5; i++) {
      const correta = GABARITO_OBJ[i];
      const aluno = answers[i] || "-";
      if (aluno === correta) acertosObj++;
      correcaoObjStr += `Q${i + 1}: ${aluno} (${aluno === correta ? "✔️" : "❌ gab:" + correta}) | `;
    }

    // 3. Corrigir Discursivas via IA (Q6-Q10)
    let correcaoIAFinal = "Aguardando IA...";
    let notaDisc = 0;

    if (GEMINI_API_KEY !== 'SUA_CHAVE_AQUI') {
      const resultadosIA = corrigirComIA(answers.slice(5));
      correcaoIAFinal = resultadosIA.feedback;
      notaDisc = resultadosIA.nota;
    }

    // 4. Gravar Dados
    // Estrutura: Timestamp | Nota Obj (0-5) | Nota Disc (0-5) | Total (0-10) | Detalhes Obj | Feedback IA | Resp Q1...Q10
    const finalGrade = acertosObj + notaDisc;
    const dataToWrite = [[
      new Date(),
      acertosObj,
      notaDisc,
      finalGrade,
      correcaoObjStr,
      correcaoIAFinal,
      ...answers
    ]];

    // Gravamos a partir da Column V
    sheet.getRange(targetRow, DATA_START_COL, 1, dataToWrite[0].length).setValues(dataToWrite);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      grade: finalGrade,
      feedback: correcaoIAFinal
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function corrigirComIA(respostasDisc) {
  let prompt = "Você é um Professor Especialista em Biologia/Ciências. Corrija as seguintes respostas discursivas de um aluno do Ensino Médio.\n\n";

  for (let i = 0; i < 5; i++) {
    const qNum = i + 6;
    prompt += `QUESTÃO ${qNum}:\nPergunta: ${RUBRICAS_DISCURSIVAS[qNum].pergunta}\nCritério: ${RUBRICAS_DISCURSIVAS[qNum].criterios}\nResposta do Aluno: "${respostasDisc[i]}"\n\n`;
  }

  prompt += "\nINSTRUÇÕES FINAIS:\n1. Atribua uma nota de 0 a 1 para CADA questão (total máximo 5).\n2. Seja justo: considere respostas incompletas com nota parcial (0.5).\n3. Forneça um feedback geral curto para o aluno.\n4. RESPONDA APENAS EM JSON no formato: {\"nota\": X, \"feedback\": \"texto\"}";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    const aiText = json.candidates[0].content.parts[0].text;

    // Limpar markdown do JSON se houver
    const jsonMatch = aiText.match(/\{.*\}/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { nota: 0, feedback: "Erro ao processar JSON da IA: " + aiText };
  } catch (e) {
    return { nota: 0, feedback: "Erro na chamada da API: " + e.toString() };
  }
}

function doGet(e) {
  const action = e.parameter.action;

  if (action === 'getGrades') {
    return getGrades();
  }

  return HtmlService.createHtmlOutput('AI Science Specialist Ativo - Biologia');
}

function getGrades() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const lastRow = sheet.getLastRow();

    if (lastRow < START_ROW) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }

    const dataRange = sheet.getRange(START_ROW, NAME_COL, lastRow - START_ROW + 1, (DATA_START_COL - NAME_COL) + 4);
    const values = dataRange.getValues();

    const grades = values.map(row => {
      const name = row[0];
      const grade = row[(DATA_START_COL - NAME_COL) + 3]; // finalGrade is at offset +3 from Column V (Column Y)
      // Range starts at Column B (NAME_COL=2).
      // Column V is 22. Offset is 20.
      // Offset 0 = B
      // Offset 20 = V (Timestamp)
      // Offset 21 = W (Nota Obj)
      // Offset 22 = X (Nota Disc)
      // Offset 23 = Y (Final Grade)

      const finalGrade = row[DATA_START_COL - NAME_COL + 3];
      // Wait, let's re-calculate.
      // Column counts: B(2), C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V(22)
      // row[0] is Column B.
      // row[22-2] = row[20] is Column V.
      // row[20+3] = row[23] is Column Y.

      return {
        nome: name.toString().trim(),
        nota: row[DATA_START_COL - NAME_COL + 3] || 0
      };
    }).filter(g => g.nome !== "");

    return ContentService.createTextOutput(JSON.stringify(grades))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
