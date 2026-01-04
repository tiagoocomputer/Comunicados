// Estado global
let comunicadoImage = null;
let comunicadoImageDataUrl = null;

// Elementos DOM
const brInteriorInput = document.getElementById('brInterior');
const spCapitalInput = document.getElementById('spCapital');
const pdfUpload = document.getElementById('pdfUpload');
const uploadStatus = document.getElementById('uploadStatus');
const btnGerarBR = document.getElementById('btnGerarBR');
const btnGerarSP = document.getElementById('btnGerarSP');
const statusMessage = document.getElementById('statusMessage');
const pagesContainer = document.getElementById('pages');

// Função para fazer upload e converter PDF para imagem
async function handlePdfUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf') {
    showStatus('Por favor, selecione um arquivo PDF.', 'error');
    return;
  }

  showStatus('Processando PDF...', 'info');
  uploadStatus.textContent = `Arquivo: ${file.name}`;

  try {
    // Aguardar pdf.js carregar
    await loadPdfJs();
    const pdfjsLib = window.pdfjsLib || window['pdfjs-dist'];
    
    if (!pdfjsLib) {
      throw new Error('PDF.js não está disponível. Recarregue a página.');
    }
    
    // Converter PDF para imagem usando FileReader e canvas
    const fileReader = new FileReader();
    
    fileReader.onload = async function(e) {
      try {
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        const page = await pdf.getPage(1);
        
        // Calcular escala para 300 DPI (A4: 210mm x 297mm)
        // 1mm = 3.779527559 pixels a 96 DPI
        // Para 300 DPI: 300/96 = 3.125
        const scale = 3.125;
        const viewport = page.getViewport({ scale: scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        comunicadoImageDataUrl = canvas.toDataURL('image/png');
        comunicadoImage = comunicadoImageDataUrl;
        
        showStatus('PDF carregado com sucesso!', 'success');
        uploadStatus.textContent = `✓ PDF carregado: ${file.name}`;
        btnGerarBR.disabled = false;
        btnGerarSP.disabled = false;
      } catch (error) {
        console.error('Erro ao processar PDF:', error);
        showStatus('Erro ao processar PDF: ' + error.message, 'error');
        uploadStatus.textContent = '✗ Erro ao processar';
      }
    };
    
    fileReader.onerror = function() {
      showStatus('Erro ao ler o arquivo PDF.', 'error');
      uploadStatus.textContent = '✗ Erro ao ler arquivo';
    };
    
    fileReader.readAsArrayBuffer(file);
  } catch (error) {
    console.error('Erro no upload:', error);
    showStatus('Erro ao fazer upload do PDF: ' + error.message, 'error');
    uploadStatus.textContent = '✗ Erro no upload';
  }
}

// Inicializar pdf.js
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Carregar pdf.js dinamicamente (fallback)
async function loadPdfJs() {
  if (window.pdfjsLib || window['pdfjs-dist']) return;
  
  return new Promise((resolve) => {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    } else {
      setTimeout(() => resolve(), 100);
    }
  });
}

// Parsear dados BR INTERIOR
function parseBrInterior(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const dados = [];
  
  lines.forEach((line, index) => {
    // Remover caracteres invisíveis e normalizar
    line = line.replace(/\r/g, '').trim();
    if (!line) return;
    
    // Aceitar tanto TAB quanto pipe (|) como separador
    let parts;
    if (line.includes('\t')) {
      // Separado por TAB
      parts = line.split('\t').map(p => p.trim()).filter(p => p);
    } else if (line.includes('|')) {
      // Separado por pipe
      parts = line.split('|').map(p => p.trim()).filter(p => p);
    } else {
      // Tentar separar por múltiplos espaços (2 ou mais)
      parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p);
    }
    
    // Verificar se tem pelo menos 4 colunas
    if (parts.length >= 4) {
      const linha = parseInt(parts[0]);
      const ramal = parseInt(parts[1]);
      const cidade = parts[2] || '';
      const qtde = parseInt(parts[3]);
      
      // Validar se os números são válidos
      if (!isNaN(linha) && !isNaN(ramal) && !isNaN(qtde) && cidade) {
        // Ignorar linhas com quantidade zero
        if (qtde > 0) {
          dados.push({ linha, ramal, cidade, qtde });
        }
      } else {
        console.warn(`Linha ${index + 1} ignorada (formato inválido):`, line);
      }
    } else if (parts.length > 0) {
      // Linha com formato diferente (pode ser SP CAPITAL misturado)
      console.warn(`Linha ${index + 1} ignorada (formato BR INTERIOR esperado):`, line);
    }
  });
  
  return dados;
}

// Parsear dados SP CAPITAL
function parseSpCapital(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const dados = [];
  
  lines.forEach((line, index) => {
    // Remover caracteres invisíveis e normalizar
    line = line.replace(/\r/g, '').trim();
    if (!line) return;
    
    // Aceitar tanto TAB quanto pipe (|) como separador
    let parts;
    if (line.includes('\t')) {
      // Separado por TAB
      parts = line.split('\t').map(p => p.trim()).filter(p => p);
    } else if (line.includes('|')) {
      // Separado por pipe
      parts = line.split('|').map(p => p.trim()).filter(p => p);
    } else {
      // Tentar separar por múltiplos espaços (2 ou mais)
      parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p);
    }
    
    // Verificar se tem pelo menos 2 colunas
    if (parts.length >= 2) {
      const filial = parts[0] || '';
      const qtde = parseInt(parts[1]);
      
      // Validar se o número é válido
      if (!isNaN(qtde) && filial) {
        // Ignorar linhas com quantidade zero
        if (qtde > 0) {
          dados.push({ filial, qtde });
        }
      } else {
        console.warn(`Linha ${index + 1} ignorada (formato inválido):`, line);
      }
    } else if (parts.length > 0) {
      console.warn(`Linha ${index + 1} ignorada (formato SP CAPITAL esperado):`, line);
    }
  });
  
  return dados;
}

// Gerar páginas HTML
function gerarPaginas(tipo, dados) {
  pagesContainer.innerHTML = '';
  
  const imageUrl = comunicadoImageDataUrl || 'poster.png';
  
  dados.forEach(item => {
    for (let i = 0; i < item.qtde; i++) {
      const page = document.createElement('div');
      page.className = 'page';
      
      let footerText = '';
      if (tipo === 'BR_INTERIOR') {
        // Formato exato: LINHA 22 - RAMAL 0 - CIDADE REGISTRO - QTDE. 10
        footerText = `LINHA ${item.linha} - RAMAL ${item.ramal} - CIDADE ${item.cidade} - QTDE. ${item.qtde}`;
      } else {
        footerText = `FILIAL ${item.filial} - QTDE. ${item.qtde}`;
      }
      
      // Criar elemento de fundo com imagem
      const bg = document.createElement('div');
      bg.className = 'bg';
      bg.style.backgroundImage = `url('${imageUrl}')`;
      bg.style.backgroundSize = 'cover';
      bg.style.backgroundPosition = 'center';
      bg.style.backgroundRepeat = 'no-repeat';
      
      // Criar rodapé
      const footer = document.createElement('div');
      footer.className = 'footer';
      footer.textContent = footerText;
      
      page.appendChild(bg);
      page.appendChild(footer);
      
      pagesContainer.appendChild(page);
    }
  });
}

// Aguardar imagem carregar
function waitForImage(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve();
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('Imagem carregada:', url);
      resolve(img);
    };
    
    img.onerror = (error) => {
      console.error('Erro ao carregar imagem:', url, error);
      // Tentar continuar mesmo com erro
      resolve(null);
    };
    
    img.src = url;
  });
}

// Verificar se existe imagem local como fallback
function verificarImagemLocal() {
  if (!comunicadoImageDataUrl) {
    // Tentar usar imagem local
    const img = new Image();
    img.onload = function() {
      comunicadoImageDataUrl = 'poster.png';
    };
    img.onerror = function() {
      // Imagem local não existe, manter null
    };
    img.src = 'poster.png';
  }
}

// Gerar PDF
async function gerarPDF(tipo) {
  // Verificar imagem local se não houver upload
  if (!comunicadoImageDataUrl) {
    verificarImagemLocal();
  }
  
  if (!comunicadoImageDataUrl) {
    showStatus('Por favor, faça o upload do PDF do comunicado primeiro ou coloque poster.png na pasta.', 'error');
    return;
  }
  
  let dados = [];
  let nomeArquivo = '';
  
  if (tipo === 'BR_INTERIOR') {
    const texto = brInteriorInput.value.trim();
    if (!texto) {
      showStatus('Por favor, cole os dados de BR INTERIOR.', 'error');
      return;
    }
    dados = parseBrInterior(texto);
    nomeArquivo = 'comunicado_br_interior.pdf';
  } else {
    const texto = spCapitalInput.value.trim();
    if (!texto) {
      showStatus('Por favor, cole os dados de SP CAPITAL.', 'error');
      return;
    }
    dados = parseSpCapital(texto);
    nomeArquivo = 'comunicado_sp_capital.pdf';
  }
  
  if (dados.length === 0) {
    showStatus('Nenhum dado válido encontrado. Verifique se há quantidades maiores que zero e se o formato está correto (linha | ramal | cidade | qtde ou separado por TAB).', 'error');
    console.log('Dados parseados:', dados);
    console.log('Texto original:', tipo === 'BR_INTERIOR' ? brInteriorInput.value : spCapitalInput.value);
    return;
  }
  
  console.log(`Dados parseados (${tipo}):`, dados);
  
  showStatus(`Gerando PDF com ${dados.length} registro(s)...`, 'info');
  
  // Aguardar imagem carregar antes de gerar páginas
  const imageUrl = comunicadoImageDataUrl || 'poster.png';
  showStatus('Carregando imagem de fundo...', 'info');
  await waitForImage(imageUrl);
  
  // Gerar páginas HTML
  gerarPaginas(tipo, dados);
  
  // Aguardar todas as imagens de fundo carregarem
  const pages = pagesContainer.querySelectorAll('.page');
  const totalPages = pages.length;
  
  showStatus(`Aguardando carregamento de ${totalPages} página(s)...`, 'info');
  
  // Aguardar cada imagem de fundo carregar
  for (let i = 0; i < pages.length; i++) {
    const bg = pages[i].querySelector('.bg');
    if (bg) {
      const bgImage = bg.style.backgroundImage;
      if (bgImage && bgImage !== 'none') {
        const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch && urlMatch[1]) {
          await waitForImage(urlMatch[1]);
        }
      }
    }
  }
  
  // Aguardar um pouco mais para garantir renderização
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    showStatus('Convertendo páginas para PDF...', 'info');
    
    // Usar html2canvas para converter cada página
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }
      
      showStatus(`Processando página ${i + 1} de ${totalPages}...`, 'info');
      
      // Obter URL da imagem de fundo
      const bg = pages[i].querySelector('.bg');
      const bgImage = bg ? bg.style.backgroundImage : null;
      let bgImageUrl = null;
      
      if (bgImage && bgImage !== 'none') {
        const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch && urlMatch[1]) {
          bgImageUrl = urlMatch[1];
        }
      }
      
      // Método alternativo: criar canvas manualmente se html2canvas falhar
      let canvas;
      let imgData;
      
      try {
        // Primeiro, tentar com html2canvas
        canvas = await html2canvas(pages[i], {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123,
          onclone: (clonedDoc) => {
            // Garantir que as imagens estejam visíveis no clone
            const clonedPage = clonedDoc.querySelector('.page');
            if (clonedPage) {
              const clonedBg = clonedPage.querySelector('.bg');
              if (clonedBg) {
                clonedBg.style.display = 'block';
                clonedBg.style.visibility = 'visible';
                clonedBg.style.opacity = '1';
              }
              const clonedFooter = clonedPage.querySelector('.footer');
              if (clonedFooter) {
                clonedFooter.style.display = 'block';
                clonedFooter.style.visibility = 'visible';
              }
            }
          }
        });
        
        imgData = canvas.toDataURL('image/png', 1.0);
        
        // Verificar se a imagem foi capturada (não está toda branca)
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
        const pixels = imageData.data;
        let hasContent = false;
        
        for (let j = 0; j < pixels.length; j += 4) {
          // Verificar se não é totalmente branco (255, 255, 255)
          if (pixels[j] < 250 || pixels[j + 1] < 250 || pixels[j + 2] < 250) {
            hasContent = true;
            break;
          }
        }
        
        if (!hasContent && bgImageUrl) {
          // Se está branco e temos URL da imagem, usar método alternativo
          throw new Error('Canvas vazio, usando método alternativo');
        }
      } catch (error) {
        console.warn('html2canvas falhou, usando método alternativo:', error);
        
        // Método alternativo: criar canvas manualmente
        canvas = document.createElement('canvas');
        canvas.width = 794; // A4 width em pixels (210mm * 3.78)
        canvas.height = 1123; // A4 height em pixels (297mm * 3.78)
        const ctx = canvas.getContext('2d');
        
        // Carregar e desenhar imagem de fundo
        if (bgImageUrl) {
          const bgImg = await new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = bgImageUrl;
          });
          
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        } else {
          // Fundo branco se não houver imagem
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Desenhar texto do rodapé
        const footer = pages[i].querySelector('.footer');
        if (footer) {
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 24px Arial'; // 8pt * 3 (scale) para corresponder ao CSS
          ctx.textBaseline = 'bottom';
          ctx.textAlign = 'center';
          const footerText = footer.textContent;
          const x = canvas.width / 2; // Centralizado
          const y = canvas.height - (15 * 3.78); // 15mm do fundo
          ctx.fillText(footerText, x, y);
        }
        
        imgData = canvas.toDataURL('image/png', 1.0);
      }
      
      // Adicionar ao PDF (A4: 210mm x 297mm)
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    }
    
    // Salvar PDF
    pdf.save(nomeArquivo);
    showStatus(`PDF gerado com sucesso! ${totalPages} página(s) criada(s).`, 'success');
    
    // Limpar páginas após um delay
    setTimeout(() => {
      pagesContainer.innerHTML = '';
    }, 2000);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    showStatus('Erro ao gerar PDF: ' + error.message, 'error');
    pagesContainer.innerHTML = '';
  }
}

// Mostrar mensagem de status
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusMessage.textContent = '';
      statusMessage.className = 'status-message';
    }, 5000);
  }
}

// Event Listeners
pdfUpload.addEventListener('change', handlePdfUpload);
btnGerarBR.addEventListener('click', () => gerarPDF('BR_INTERIOR'));
btnGerarSP.addEventListener('click', () => gerarPDF('SP_CAPITAL'));

// Inicialização
window.addEventListener('DOMContentLoaded', () => {
  verificarImagemLocal();
  // Aguardar um pouco para verificar se a imagem carregou
  setTimeout(() => {
    if (comunicadoImageDataUrl) {
      btnGerarBR.disabled = false;
      btnGerarSP.disabled = false;
    }
  }, 500);
});
