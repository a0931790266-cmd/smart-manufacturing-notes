/**
 * 智慧製造筆記收藏館 - 輕量安全 Markdown 解析器 (Zero-dependency & XSS-safe)
 * 支援 Frontmatter 擷取、標準 GFM 語法（標題、清單、表格、區塊引言、程式碼、行內格式）
 */
(function (global) {
  'use strict';

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function sanitizeUrl(url) {
    if (!url) return '#';
    var clean = url.trim();
    if (/^(javascript:|data:|vbscript:)/i.test(clean)) {
      return '#';
    }
    return escapeHtml(clean);
  }

  function parseFrontmatter(markdown) {
    var meta = {};
    var content = markdown;
    var match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (match) {
      var yamlBlock = match[1];
      content = match[2];
      var lines = yamlBlock.split(/\r?\n/);
      lines.forEach(function (line) {
        var colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          var key = line.slice(0, colonIdx).trim();
          var val = line.slice(colonIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          } else if (val.startsWith('[') && val.endsWith(']')) {
            try {
              val = JSON.parse(val.replace(/'/g, '"'));
            } catch (e) {
              val = val.slice(1, -1).split(',').map(function (s) { return s.trim().replace(/^['"]|['"]$/g, ''); });
            }
          }
          meta[key] = val;
        }
      });
    }
    return { meta: meta, content: content };
  }

  function parseInline(text) {
    if (!text) return '';
    var out = escapeHtml(text);

    // 行內程式碼 `code`
    out = out.replace(/`([^`]+)`/g, function (_, code) {
      return '<code>' + code + '</code>';
    });

    // 粗體 **bold** 或 __bold__
    out = out.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

    // 斜體 *italic* 或 _italic_
    out = out.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

    // 刪除線 ~~strike~~
    out = out.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // 超連結 [text](url)
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, url) {
      return '<a href="' + sanitizeUrl(url) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
    });

    return out;
  }

  function parseMarkdown(md) {
    if (!md) return '';
    var lines = md.replace(/\r\n/g, '\n').split('\n');
    var html = [];
    var inList = null; // 'ul' or 'ol'
    var inCodeBlock = false;
    var codeBlockLang = '';
    var codeBlockLines = [];
    var inTable = false;
    var tableHeader = [];
    var tableRows = [];

    function closeList() {
      if (inList) {
        html.push('</' + inList + '>');
        inList = null;
      }
    }

    function closeTable() {
      if (inTable) {
        var tHtml = '<div class="table-container"><table><thead><tr>';
        tableHeader.forEach(function (h) {
          tHtml += '<th>' + parseInline(h) + '</th>';
        });
        tHtml += '</tr></thead><tbody>';
        tableRows.forEach(function (row) {
          tHtml += '<tr>';
          row.forEach(function (cell) {
            tHtml += '<td>' + parseInline(cell) + '</td>';
          });
          tHtml += '</tr>';
        });
        tHtml += '</tbody></table></div>';
        html.push(tHtml);
        inTable = false;
        tableHeader = [];
        tableRows = [];
      }
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      // 程式碼區塊 ```
      var codeMatch = line.match(/^```(\w+)?/);
      if (codeMatch) {
        if (!inCodeBlock) {
          closeList();
          closeTable();
          inCodeBlock = true;
          codeBlockLang = codeMatch[1] || '';
          codeBlockLines = [];
        } else {
          var codeContent = escapeHtml(codeBlockLines.join('\n'));
          var langClass = codeBlockLang ? ' class="language-' + escapeHtml(codeBlockLang) + '"' : '';
          html.push('<pre><code' + langClass + '>' + codeContent + '</code></pre>');
          inCodeBlock = false;
          codeBlockLang = '';
          codeBlockLines = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      // 表格列判斷 (| col1 | col2 |)
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        closeList();
        var rawCells = line.trim().slice(1, -1).split('|').map(function (c) { return c.trim(); });
        
        // 檢查是否為分隔線 |---|---|
        var isSeparator = rawCells.every(function (c) { return /^:?-+:?$/.test(c); });
        if (isSeparator) {
          continue;
        }

        if (!inTable) {
          inTable = true;
          tableHeader = rawCells;
          tableRows = [];
        } else {
          tableRows.push(rawCells);
        }
        continue;
      } else {
        closeTable();
      }

      // 標題 # ~ ######
      var headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        closeList();
        var level = headingMatch[1].length;
        var hText = headingMatch[2].trim();
        html.push('<h' + level + '>' + parseInline(hText) + '</h' + level + '>');
        continue;
      }

      // 分隔線 --- 或 ***
      if (/^(\-{3,}|\*{3,})$/.test(line.trim())) {
        closeList();
        html.push('<hr>');
        continue;
      }

      // 引言區塊 > quote
      var quoteMatch = line.match(/^>\s?(.*)$/);
      if (quoteMatch) {
        closeList();
        var quoteText = quoteMatch[1];
        html.push('<blockquote><p>' + parseInline(quoteText) + '</p></blockquote>');
        continue;
      }

      // 無序清單 - item, * item
      var ulMatch = line.match(/^[\*\-]\s+(.*)$/);
      if (ulMatch) {
        if (inList !== 'ul') {
          closeList();
          html.push('<ul>');
          inList = 'ul';
        }
        html.push('<li>' + parseInline(ulMatch[1]) + '</li>');
        continue;
      }

      // 有序清單 1. item
      var olMatch = line.match(/^\d+\.\s+(.*)$/);
      if (olMatch) {
        if (inList !== 'ol') {
          closeList();
          html.push('<ol>');
          inList = 'ol';
        }
        html.push('<li>' + parseInline(olMatch[1]) + '</li>');
        continue;
      }

      // 空行
      if (line.trim() === '') {
        closeList();
        continue;
      }

      // 一般段落
      closeList();
      html.push('<p>' + parseInline(line) + '</p>');
    }

    closeList();
    closeTable();

    return html.join('\n');
  }

  var SimpleMarkdown = {
    parse: function (md) {
      var parsed = parseFrontmatter(md);
      return parseMarkdown(parsed.content);
    },
    parseWithFrontmatter: function (md) {
      var parsed = parseFrontmatter(md);
      return {
        meta: parsed.meta,
        html: parseMarkdown(parsed.content)
      };
    }
  };

  global.SimpleMarkdown = SimpleMarkdown;
  if (!global.marked) {
    global.marked = {
      parse: function (text) {
        return SimpleMarkdown.parse(text);
      }
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleMarkdown;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
