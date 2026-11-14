/**
 * 智慧製造筆記收藏館 - 筆記閱讀頁面邏輯 (note.js)
 * 負責：解析 URL 參數、載入索引元資料與獨立 Markdown 筆記、渲染完整內容、處理例外狀態
 */
(function () {
  'use strict';

  function init() {
    var params = new URLSearchParams(window.location.search);
    var noteId = params.get('id');

    if (!noteId) {
      showError('缺少筆記代碼', '未指定要閱讀的筆記，請返回首頁選擇筆記。');
      return;
    }

    loadNote(noteId);
  }

  function loadNote(noteId) {
    // 步驟 1：先讀取 data/notes.json 取得中繼資訊
    fetch('data/notes.json')
      .then(function (res) {
        if (!res.ok) throw new Error('無法讀取 notes.json');
        return res.json();
      })
      .then(function (notes) {
        var noteMeta = notes.find(function (n) { return n.id === noteId; });
        if (!noteMeta) {
          throw new Error('找不到指定的筆記（ID: ' + noteId + '）');
        }

        // 更新瀏覽器分頁標題
        document.title = (noteMeta.title || '筆記閱讀') + ' | 智慧製造筆記收藏館';

        // 渲染中繼資料檔頭
        renderNoteHeader(noteMeta);
        renderNoteFooter(noteMeta);

        // 步驟 2：載入對應之獨立 Markdown 檔案
        var mdPath = noteMeta.filePath || ('notes/' + noteId + '.md');
        return fetch(mdPath)
          .then(function (mdRes) {
            if (!mdRes.ok) throw new Error('無法讀取 Markdown 內容 (HTTP ' + mdRes.status + ')');
            return mdRes.text();
          })
          .then(function (mdContent) {
            renderMarkdownBody(mdContent);
          });
      })
      .catch(function (err) {
        console.error('載入筆記失敗:', err);
        showError('筆記載入失敗', err.message || '無法取得筆記內容，請檢查檔案是否存在。');
      });
  }

  function renderNoteHeader(meta) {
    var container = document.getElementById('note-header-container');
    if (!container) return;

    var chapter = escapeHtml(meta.chapter || '未分類章節');
    var topic = escapeHtml(meta.topic || '一般主題');
    var title = escapeHtml(meta.title || '無標題');
    var created = escapeHtml(meta.created || '未提供');
    var updated = escapeHtml(meta.updated || '未提供');
    var sourcePage = escapeHtml(meta.sourcePage || '未提供');

    var tagsHtml = '';
    if (Array.isArray(meta.tags) && meta.tags.length > 0) {
      tagsHtml = '<div class="tag-list">' +
        meta.tags.map(function (t) {
          return '<span class="tag-item">#' + escapeHtml(t) + '</span>';
        }).join('') +
        '</div>';
    }

    container.innerHTML =
      '<div class="note-badges">' +
        '<span class="badge badge-chapter">' + chapter + '</span>' +
        '<span class="badge badge-topic">' + topic + '</span>' +
      '</div>' +
      '<h1 class="note-title">' + title + '</h1>' +
      '<div class="note-meta-grid">' +
        '<div class="meta-col">' +
          '<span class="meta-label">課程章節</span>' +
          '<span class="meta-value">' + chapter + '</span>' +
        '</div>' +
        '<div class="meta-col">' +
          '<span class="meta-label">知識主題</span>' +
          '<span class="meta-value">' + topic + '</span>' +
        '</div>' +
        '<div class="meta-col">' +
          '<span class="meta-label">原始講義頁碼</span>' +
          '<span class="meta-value">' + sourcePage + '</span>' +
        '</div>' +
        '<div class="meta-col">' +
          '<span class="meta-label">最後更新日期</span>' +
          '<span class="meta-value">' + updated + '</span>' +
        '</div>' +
      '</div>' +
      tagsHtml;
  }

  function renderMarkdownBody(mdContent) {
    var bodyContainer = document.getElementById('note-body-container');
    if (!bodyContainer) return;

    var parsedHtml = '';
    if (window.SimpleMarkdown && typeof window.SimpleMarkdown.parse === 'function') {
      parsedHtml = window.SimpleMarkdown.parse(mdContent);
    } else if (window.marked && typeof window.marked.parse === 'function') {
      parsedHtml = window.marked.parse(mdContent);
    } else {
      parsedHtml = '<pre>' + escapeHtml(mdContent) + '</pre>';
    }

    bodyContainer.innerHTML = parsedHtml;
  }

  function renderNoteFooter(meta) {
    var footerContainer = document.getElementById('note-footer-container');
    if (!footerContainer) return;

    var sourcePage = escapeHtml(meta.sourcePage || '未提供');
    var updated = escapeHtml(meta.updated || '未提供');
    var created = escapeHtml(meta.created || '未提供');

    footerContainer.innerHTML =
      '<div class="note-footer-info">' +
        '<span><strong>講義頁碼：</strong>' + sourcePage + '</span>' +
        '<span><strong>建立日期：</strong>' + created + '</span>' +
        '<span><strong>最後更新：</strong>' + updated + '</span>' +
      '</div>' +
      '<div>' +
        '<a href="./index.html" class="btn-back" style="padding: 6px 14px; font-size: 0.82rem;">&uarr; 返回筆記總覽</a>' +
      '</div>';
  }

  function showError(title, message) {
    var container = document.getElementById('note-view-wrapper');
    if (!container) return;

    container.innerHTML =
      '<div class="note-article" style="text-align: center; padding: 60px 20px;">' +
        '<div style="font-size: 3rem; margin-bottom: 16px;">⚠️</div>' +
        '<h2 style="font-size: 1.5rem; color: var(--text-main); margin-bottom: 10px;">' + escapeHtml(title) + '</h2>' +
        '<p style="color: var(--text-secondary); margin-bottom: 24px;">' + escapeHtml(message) + '</p>' +
        '<a href="./index.html" class="btn-back">&larr; 返回筆記總覽</a>' +
      '</div>';
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
