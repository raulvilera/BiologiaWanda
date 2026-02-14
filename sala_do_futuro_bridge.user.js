// ==UserScript==
// @name         Sala do Futuro + Planilha Biologia
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Importa notas da Planilha de Biologia para a Sala do Futuro
// @author       Antigravity AI
// @match        https://saladofuturoprofessor.educacao.sp.gov.br/diario-classe__avalicao__lancamento*
// @grant        GM_xmlhttpRequest
// @connect      script.google.com
// @connect      script.googleusercontent.com
// ==/UserScript==

(function () {
    'use strict';

    // CONFIGURAÇÃO - URL do seu Google Apps Script
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbwhwwN92DGIOLLMI4MPyPin6KKEAjpxjx1dodyEJrAOknlcTCfjijV32vb89ZRcTG4/exec?action=getGrades';

    function addImportButton() {
        if (document.getElementById('btn-importar-planilha')) return;

        const container = document.querySelector('.header-container') || document.querySelector('h1') || document.body;
        const btn = document.createElement('button');
        btn.id = 'btn-importar-planilha';
        btn.innerHTML = '📥 Importar Notas da Planilha';
        btn.style.cssText = 'margin: 10px; padding: 10px 20px; background: #1a4e3a; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; z-index: 9999; position: relative;';

        btn.onclick = fetchAndFillGrades;
        container.prepend(btn);
    }

    function fetchAndFillGrades() {
        const btn = document.getElementById('btn-importar-planilha');
        btn.innerHTML = '⏳ Buscando notas...';
        btn.disabled = true;

        GM_xmlhttpRequest({
            method: "GET",
            url: GAS_URL,
            onload: function (response) {
                try {
                    const grades = JSON.parse(response.responseText);
                    console.log('Notas carregadas:', grades);
                    fillGrades(grades);
                    btn.innerHTML = '✅ Notas Importadas!';
                } catch (e) {
                    console.error('Erro ao processar JSON:', e);
                    btn.innerHTML = '❌ Erro no JSON';
                }
                setTimeout(() => {
                    btn.innerHTML = '📥 Importar Notas da Planilha';
                    btn.disabled = false;
                }, 3000);
            },
            onerror: function (err) {
                console.error('Erro na requisição:', err);
                btn.innerHTML = '❌ Erro de Conexão';
                btn.disabled = false;
            }
        });
    }

    function fillGrades(grades) {
        // Mapear nomes para notas para busca rápida
        const gradeMap = {};
        grades.forEach(g => {
            gradeMap[normalizeName(g.nome)] = g.nota;
        });

        // Localizar linhas da tabela de alunos (ajustar conforme o DOM real da Sala do Futuro)
        // Baseado na estrutura comum dessas plataformas:
        const rows = document.querySelectorAll('tr, .student-row, div[role="row"]');
        let count = 0;

        rows.forEach(row => {
            const text = row.innerText || "";
            // Tentar encontrar um nome na linha que coincida com a nossa planilha
            for (let name in gradeMap) {
                if (normalizeText(text).includes(name)) {
                    const input = row.querySelector('input[type="number"], input.grade-input, input[role="textbox"]');
                    if (input) {
                        input.value = gradeMap[name].toString().replace('.', ',');
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        input.style.backgroundColor = '#e2ffd6';
                        count++;
                        break;
                    }
                }
            }
        });

        alert(`${count} notas foram preenchidas automaticamente! Revise antes de salvar.`);
    }

    function normalizeName(name) {
        return normalizeText(name);
    }

    function normalizeText(text) {
        return text.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
            .replace(/[^a-z0-9]/g, " ")
            .trim();
    }

    // Tentar adicionar o botão periodicamente (para lidar com carregamento dinâmico SPA)
    setInterval(addImportButton, 2000);

})();
