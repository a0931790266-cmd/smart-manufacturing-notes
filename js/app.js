/**
 * 智慧製造筆記收藏館 - 首頁應用程式邏輯 (app.js)
 * 負責：載入筆記索引、即時關鍵字搜尋、互斥章節/主題篩選、最新新增/章節順序排序切換、統計數據連動
 */
(function () {
  'use strict';

  // 狀態管理
  var state = {
    allNotes: [],
    searchKeyword: '',
    selectedChapter: '',
    selectedTopic: '',
    sortBy: 'newest' // 'newest' | 'chapter'
  };

  // DOM 元素快取
  var elements = {
    totalNotesCount: document.getElementById('total-notes-count'),
    sidebarChapterList: document.getElementById('sidebar-chapter-list'),
    sidebarTopicList: document.getElementById('sidebar-topic-list'),
    recentNotesSection: document.getElementById('recent-notes-section'),
    recentNotesGrid: document.getElementById('recent-notes-grid'),
    allNotesSection: document.getElementById('all-notes-section'),
    allNotesGrid: document.getElementById('all-notes-grid'),
    allNotesCount: document.getElementById('all-notes-count'),
    notesListTitle: document.getElementById('notes-list-title'),
    searchInput: document.getElementById('search-input'),
    sortNewestBtn: document.getElementById('sort-newest-btn'),
    sortChapterBtn: document.getElementById('sort-chapter-btn'),
    activeFiltersBar: document.getElementById('active-filters-bar'),
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn')
  };

  // 初始化函式
  function init() {
    bindEvents();
    loadNotesData();
  }

  // 繫結使用者互動事件
  function bindEvents() {
    // 關鍵字搜尋（即時過濾）
    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', function (e) {
        state.searchKeyword = e.target.value.trim().toLowerCase();
        render();
      });
    }

    // 排序切換：最新新增
    if (elements.sortNewestBtn) {
      elements.sortNewestBtn.addEventListener('click', function () {
        if (state.sortBy !== 'newest') {
          state.sortBy = 'newest';
          elements.sortNewestBtn.classList.add('active');
          elements.sortChapterBtn.classList.remove('active');
          render();
        }
      });
    }

    // 排序切換：章節順序
    if (elements.sortChapterBtn) {
      elements.sortChapterBtn.addEventListener('click', function () {
        if (state.sortBy !== 'chapter') {
          state.sortBy = 'chapter';
          elements.sortChapterBtn.classList.add('active');
          elements.sortNewestBtn.classList.remove('active');
          render();
        }
      });
    }

    // 手機版側邊欄切換
    if (elements.mobileMenuBtn && elements.sidebar && elements.sidebarOverlay) {
      elements.mobileMenuBtn.addEventListener('click', function () {
        elements.sidebar.classList.toggle('open');
        elements.sidebarOverlay.classList.toggle('active');
      });

      elements.sidebarOverlay.addEventListener('click', function () {
        elements.sidebar.classList.remove('open');
        elements.sidebarOverlay.classList.remove('active');
      });
    }
  }

  // 載入筆記索引資料 (data/notes.json)
  function loadNotesData() {
    fetch('data/notes.json')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('無法讀取 notes.json (HTTP ' + response.status + ')');
        }
        return response.json();
      })
      .then(function (data) {
        state.allNotes = Array.isArray(data) ? data : [];
        updateSidebarStats();
        render();
      })
      .catch(function (error) {
        console.error('載入筆記資料失敗:', error);
        if (elements.allNotesGrid) {
          elements.allNotesGrid.innerHTML =
            '<div class="empty-state">' +
            '<div class="empty-icon">⚠️</div>' +
            '<div class="empty-text">無法載入筆記資料</div>' +
            '<div class="empty-subtext">請確認 data/notes.json 檔案是否存在且格式正確。</div>' +
            '</div>';
        }
      });
  }

  // 更新側邊欄筆記總數與章節、主題清單（支援互斥切換）
  function updateSidebarStats() {
    if (elements.totalNotesCount) {
      elements.totalNotesCount.textContent = state.allNotes.length;
    }

    // 計算章節統計
    var chapterMap = {};
    var topicMap = {};

    state.allNotes.forEach(function (note) {
      var ch = note.chapter || '未分類章節';
      var top = note.topic || '未分類主題';
      chapterMap[ch] = (chapterMap[ch] || 0) + 1;
      topicMap[top] = (topicMap[top] || 0) + 1;
    });

    // 渲染側邊欄章節列表
    if (elements.sidebarChapterList) {
      elements.sidebarChapterList.innerHTML = '';
      
      // 全部章節選項：清除分類篩選，但保留關鍵字搜尋結果
      var allChLi = createFilterItem('全部章節', state.allNotes.length, state.selectedChapter === '' && state.selectedTopic === '', function () {
        state.selectedChapter = '';
        state.selectedTopic = '';
        render();
      });
      elements.sidebarChapterList.appendChild(allChLi);

      Object.keys(chapterMap).sort().forEach(function (ch) {
        var li = createFilterItem(ch, chapterMap[ch], state.selectedChapter === ch, function () {
          if (state.selectedChapter === ch) {
            state.selectedChapter = '';
          } else {
            state.selectedChapter = ch;
            state.selectedTopic = ''; // 互斥：選擇章節即自動取消主題
          }
          render();
        });
        elements.sidebarChapterList.appendChild(li);
      });
    }

    // 渲染側邊欄主題列表
    if (elements.sidebarTopicList) {
      elements.sidebarTopicList.innerHTML = '';

      // 全部主題選項：清除分類篩選，但保留關鍵字搜尋結果
      var allTopLi = createFilterItem('全部主題', state.allNotes.length, state.selectedChapter === '' && state.selectedTopic === '', function () {
        state.selectedChapter = '';
        state.selectedTopic = '';
        render();
      });
      elements.sidebarTopicList.appendChild(allTopLi);

      Object.keys(topicMap).sort().forEach(function (top) {
        var li = createFilterItem(top, topicMap[top], state.selectedTopic === top, function () {
          if (state.selectedTopic === top) {
            state.selectedTopic = '';
          } else {
            state.selectedTopic = top;
            state.selectedChapter = ''; // 互斥：選擇主題即自動取消章節
          }
          render();
        });
        elements.sidebarTopicList.appendChild(li);
      });
    }
  }

  // 輔助函式：建立側邊欄篩選項目元素
  function createFilterItem(label, count, isActive, onClick) {
    var li = document.createElement('li');
    li.className = 'filter-item' + (isActive ? ' active' : '');
    li.innerHTML = '<span class="filter-name">' + escapeHtml(label) + '</span>' +
                   '<span class="filter-count">' + count + '</span>';
    li.addEventListener('click', function () {
      onClick();
      // 在手機上點擊篩選後關閉側邊欄
      if (window.innerWidth <= 992 && elements.sidebar) {
        elements.sidebar.classList.remove('open');
        if (elements.sidebarOverlay) elements.sidebarOverlay.classList.remove('active');
      }
    });
    return li;
  }

  // 主渲染排版流程
  function render() {
    updateFilterActiveStyles();
    renderActiveFilterChips();
    renderRecentNotes();
    renderAllNotes();
  }

  // 同步側邊欄項目的 active class 狀態（落實互斥選取顯示）
  function updateFilterActiveStyles() {
    var hasCategory = Boolean(state.selectedChapter || state.selectedTopic);

    if (elements.sidebarChapterList) {
      var items = elements.sidebarChapterList.querySelectorAll('.filter-item');
      items.forEach(function (item) {
        var name = item.querySelector('.filter-name').textContent;
        if (!hasCategory && name === '全部章節') {
          item.classList.add('active');
        } else if (state.selectedChapter && state.selectedChapter === name) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }

    if (elements.sidebarTopicList) {
      var topItems = elements.sidebarTopicList.querySelectorAll('.filter-item');
      topItems.forEach(function (item) {
        var name = item.querySelector('.filter-name').textContent;
        if (!hasCategory && name === '全部主題') {
          item.classList.add('active');
        } else if (state.selectedTopic && state.selectedTopic === name) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }
  }

  // 渲染目前作用中的篩選標籤指示條
  function renderActiveFilterChips() {
    if (!elements.activeFiltersBar) return;

    var chips = [];

    if (state.searchKeyword) {
      chips.push({
        label: '搜尋: ' + state.searchKeyword,
        clear: function () {
          state.searchKeyword = '';
          if (elements.searchInput) elements.searchInput.value = '';
          render();
        }
      });
    }

    if (state.selectedChapter) {
      chips.push({
        label: '章節: ' + state.selectedChapter,
        clear: function () {
          state.selectedChapter = '';
          render();
        }
      });
    } else if (state.selectedTopic) {
      chips.push({
        label: '主題: ' + state.selectedTopic,
        clear: function () {
          state.selectedTopic = '';
          render();
        }
      });
    }

    if (chips.length === 0) {
      elements.activeFiltersBar.innerHTML = '';
      elements.activeFiltersBar.style.display = 'none';
      return;
    }

    elements.activeFiltersBar.style.display = 'flex';
    elements.activeFiltersBar.innerHTML = '';

    chips.forEach(function (chip) {
      var span = document.createElement('span');
      span.className = 'filter-chip';
      span.innerHTML = '<span>' + escapeHtml(chip.label) + '</span>' +
                       '<button type="button" class="filter-chip-remove" aria-label="移除篩選">&times;</button>';
      span.querySelector('.filter-chip-remove').addEventListener('click', chip.clear);
      elements.activeFiltersBar.appendChild(span);
    });

    var clearAllBtn = document.createElement('button');
    clearAllBtn.type = 'button';
    clearAllBtn.className = 'filter-clear-all';
    clearAllBtn.textContent = '清除所有條件';
    clearAllBtn.addEventListener('click', function () {
      state.searchKeyword = '';
      state.selectedChapter = '';
      state.selectedTopic = '';
      if (elements.searchInput) elements.searchInput.value = '';
      render();
    });
    elements.activeFiltersBar.appendChild(clearAllBtn);
  }

  // 渲染「最近新增」筆記（有條件時完整隱藏）
  function renderRecentNotes() {
    if (!elements.recentNotesGrid || !elements.recentNotesSection) return;

    var hasKeyword = Boolean(state.searchKeyword);
    var hasCategory = Boolean(state.selectedChapter || state.selectedTopic);
    var hasFilter = hasKeyword || hasCategory;

    // 只要有搜尋關鍵字或分類篩選條件，即完整隱藏「最近新增」區塊（含標題、卡片及邊距）
    if (hasFilter) {
      elements.recentNotesSection.style.display = 'none';
      return;
    }

    var sortedByDate = state.allNotes.slice().sort(function (a, b) {
      return (b.created || '').localeCompare(a.created || '');
    });

    var recentThree = sortedByDate.slice(0, 3);

    if (recentThree.length === 0) {
      elements.recentNotesSection.style.display = 'none';
      return;
    }

    elements.recentNotesSection.style.display = 'block';
    elements.recentNotesGrid.innerHTML = recentThree.map(createNoteCardHtml).join('');
  }

  // 渲染「全部筆記」或「搜尋/篩選結果」
  function renderAllNotes() {
    if (!elements.allNotesGrid) return;

    var hasKeyword = Boolean(state.searchKeyword);
    var hasCategory = Boolean(state.selectedChapter || state.selectedTopic);

    // 動態更新區塊標題文字
    if (elements.notesListTitle) {
      if (hasKeyword) {
        elements.notesListTitle.textContent = '搜尋結果';
      } else if (hasCategory) {
        elements.notesListTitle.textContent = '篩選結果';
      } else {
        elements.notesListTitle.textContent = '全部筆記';
      }
    }

    // 進行過濾
    var filtered = state.allNotes.filter(function (note) {
      // 關鍵字搜尋（比對標題、摘要、章節、主題、標籤）
      if (state.searchKeyword) {
        var kw = state.searchKeyword;
        var inTitle = (note.title || '').toLowerCase().indexOf(kw) !== -1;
        var inSummary = (note.summary || '').toLowerCase().indexOf(kw) !== -1;
        var inChapter = (note.chapter || '').toLowerCase().indexOf(kw) !== -1;
        var inTopic = (note.topic || '').toLowerCase().indexOf(kw) !== -1;
        var inTags = (note.tags || []).some(function (t) {
          return t.toLowerCase().indexOf(kw) !== -1;
        });

        if (!inTitle && !inSummary && !inChapter && !inTopic && !inTags) {
          return false;
        }
      }

      // 章節篩選
      if (state.selectedChapter && note.chapter !== state.selectedChapter) {
        return false;
      }

      // 主題篩選
      if (state.selectedTopic && note.topic !== state.selectedTopic) {
        return false;
      }

      return true;
    });

    // 進行排序
    filtered.sort(function (a, b) {
      if (state.sortBy === 'chapter') {
        // 先依照章節順序 chapterOrder，若無則依章節字串
        var orderA = typeof a.chapterOrder === 'number' ? a.chapterOrder : 999;
        var orderB = typeof b.chapterOrder === 'number' ? b.chapterOrder : 999;
        if (orderA !== orderB) return orderA - orderB;
        var chCompare = (a.chapter || '').localeCompare(b.chapter || '', 'zh-Hant');
        if (chCompare !== 0) return chCompare;
        return (b.created || '').localeCompare(a.created || '');
      } else {
        // 預設 'newest' 最新新增
        return (b.created || '').localeCompare(a.created || '');
      }
    });

    if (elements.allNotesCount) {
      elements.allNotesCount.textContent = '（共 ' + filtered.length + ' 篇）';
    }

    if (filtered.length === 0) {
      elements.allNotesGrid.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-icon">🔍</div>' +
        '<div class="empty-text">找不到符合條件的筆記</div>' +
        '<div class="empty-subtext">嘗試更換搜尋關鍵字或清除篩選條件。</div>' +
        '</div>';
      return;
    }

    elements.allNotesGrid.innerHTML = filtered.map(createNoteCardHtml).join('');
  }

  // 產生單一筆記卡片的 HTML
  function createNoteCardHtml(note) {
    var noteUrl = './note.html?id=' + encodeURIComponent(note.id);
    var chapterBadge = escapeHtml(note.chapter || '未分類章節');
    var topicBadge = escapeHtml(note.topic || '一般主題');
    var title = escapeHtml(note.title || '無標題筆記');
    var summary = escapeHtml(note.summary || '尚無摘要內容。');
    var date = escapeHtml(note.created || '');

    return (
      '<article class="note-card">' +
        '<div class="card-badges">' +
          '<span class="badge badge-chapter">' + chapterBadge + '</span>' +
          '<span class="badge badge-topic">' + topicBadge + '</span>' +
        '</div>' +
        '<h3 class="card-title">' +
          '<a href="' + noteUrl + '">' + title + '</a>' +
        '</h3>' +
        '<p class="card-summary">' + summary + '</p>' +
        '<div class="card-footer">' +
          '<span class="card-date">📅 ' + date + '</span>' +
          '<a href="' + noteUrl + '" class="read-more-btn">閱讀完整筆記 &rarr;</a>' +
        '</div>' +
      '</article>'
    );
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

  // 當 DOM 就緒時啟動
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
