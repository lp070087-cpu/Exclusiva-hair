/* ==========================================================================
   EXCLUSIVA HAIR — app.js
   Sem dependências. Cada módulo sai cedo se o seu elemento não existir.
   Nada de parallax agressivo, nada de sequestro de rolagem, nada de listener
   de scroll pesado: revelações por IntersectionObserver e interações por evento.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     Utilidades
     --------------------------------------------------------------------- */
  var movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');

  var $  = function (sel, escopo) { return (escopo || document).querySelector(sel); };
  var $$ = function (sel, escopo) {
    return Array.prototype.slice.call((escopo || document).querySelectorAll(sel));
  };

  /* ---------------------------------------------------------------------
     1. Cabeçalho: estado sólido ao rolar + item ativo da navegação
     Um único listener passivo, com leitura de scrollY e escrita só quando
     o estado realmente muda (evita layout thrashing).
     --------------------------------------------------------------------- */
  (function cabecalho() {
    var cab = $('#cabecalho');
    var barra = $('#barra-agendar');
    if (!cab) return;

    var rolou = false;
    var barraVisivel = false;

    function aplicar() {
      var y = window.scrollY || window.pageYOffset;
      var deveRolar = y > 40;
      if (deveRolar !== rolou) {
        rolou = deveRolar;
        cab.classList.toggle('rolado', rolou);
      }
      if (barra) {
        var mostraBarra = y > window.innerHeight * 1.2;
        if (mostraBarra !== barraVisivel) {
          barraVisivel = mostraBarra;
          barra.classList.toggle('visivel', barraVisivel);
        }
      }
    }

    window.addEventListener('scroll', aplicar, { passive: true });
    aplicar();

    // Item da navegação correspondente à seção visível
    var links = $$('.nav__link');
    if (links.length && 'IntersectionObserver' in window) {
      var alvos = links
        .map(function (l) {
          var id = l.getAttribute('href');
          return id && id.charAt(0) === '#' ? $(id) : null;
        })
        .filter(Boolean);

      var obs = new IntersectionObserver(
        function (entradas) {
          entradas.forEach(function (e) {
            if (!e.isIntersecting) return;
            var id = '#' + e.target.id;
            links.forEach(function (l) {
              if (l.getAttribute('href') === id) l.setAttribute('aria-current', 'true');
              else l.removeAttribute('aria-current');
            });
          });
        },
        { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
      );
      alvos.forEach(function (a) { obs.observe(a); });
    }
  })();

  /* ---------------------------------------------------------------------
     2. Menu mobile
     --------------------------------------------------------------------- */
  (function menu() {
    var botao = $('#botao-menu');
    var painel = $('#menu-mobile');
    var fechar = $('#menu-fechar');
    if (!botao || !painel) return;

    var anterior = null;

    function abrir() {
      anterior = document.activeElement;
      painel.hidden = false;
      // Força um reflow para a transição rodar a partir do estado fechado
      void painel.offsetHeight;
      painel.classList.add('aberto');
      botao.setAttribute('aria-expanded', 'true');
      botao.setAttribute('aria-label', 'Fechar menu');
      document.documentElement.classList.add('travado');
      var primeiro = $('.menu-mobile__link', painel);
      if (primeiro) primeiro.focus({ preventScroll: true });
    }

    function fecharMenu(devolverFoco) {
      painel.classList.remove('aberto');
      botao.setAttribute('aria-expanded', 'false');
      botao.setAttribute('aria-label', 'Abrir menu');
      document.documentElement.classList.remove('travado');
      var esperar = movimentoReduzido.matches ? 0 : 380;
      window.setTimeout(function () {
        if (!painel.classList.contains('aberto')) painel.hidden = true;
      }, esperar);
      if (devolverFoco && anterior) anterior.focus({ preventScroll: true });
    }

    botao.addEventListener('click', function () {
      if (painel.classList.contains('aberto')) fecharMenu(true);
      else abrir();
    });

    if (fechar) fechar.addEventListener('click', function () { fecharMenu(true); });

    // Fechar ao escolher um destino
    $$('.menu-mobile__link, .menu-mobile .btn', painel).forEach(function (l) {
      l.addEventListener('click', function () { fecharMenu(false); });
    });

    // Escape fecha; Tab fica preso dentro do painel enquanto aberto
    document.addEventListener('keydown', function (e) {
      if (!painel.classList.contains('aberto')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        fecharMenu(true);
        return;
      }
      if (e.key !== 'Tab') return;
      var focaveis = $$('a[href], button:not([disabled])', painel);
      if (!focaveis.length) return;
      var primeiro = focaveis[0];
      var ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    });

    // Se a janela crescer para desktop, garante o painel fechado
    var mq = window.matchMedia('(min-width: 900px)');
    var aoMudar = function (e) { if (e.matches) fecharMenu(false); };
    if (mq.addEventListener) mq.addEventListener('change', aoMudar);
    else if (mq.addListener) mq.addListener(aoMudar);
  })();

  /* ---------------------------------------------------------------------
     3. Revelações por IntersectionObserver
     Um observador único para todos os elementos [data-revelar].
     --------------------------------------------------------------------- */
  (function revelacoes() {
    var alvos = $$('[data-revelar]');
    if (!alvos.length) return;

    if (!('IntersectionObserver' in window) || movimentoReduzido.matches) {
      alvos.forEach(function (el) { el.classList.add('visivel'); });
      return;
    }

    var obs = new IntersectionObserver(
      function (entradas, observador) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('visivel');
          observador.unobserve(e.target);   // revela uma vez só: sem custo contínuo
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );

    alvos.forEach(function (el) { obs.observe(el); });
  })();

  /* ---------------------------------------------------------------------
     4. Contadores
     --------------------------------------------------------------------- */
  (function contadores() {
    var alvos = $$('[data-contar]');
    if (!alvos.length) return;

    function formatar(n) { return n.toLocaleString('pt-BR'); }

    if (!('IntersectionObserver' in window) || movimentoReduzido.matches) return;

    var obs = new IntersectionObserver(
      function (entradas, observador) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          observador.unobserve(el);
          var destino = parseInt(el.getAttribute('data-contar'), 10);
          if (isNaN(destino)) return;
          var inicio = null;
          var duracao = 1400;
          function passo(ts) {
            if (inicio === null) inicio = ts;
            var p = Math.min((ts - inicio) / duracao, 1);
            var suavizado = 1 - Math.pow(1 - p, 3);
            el.textContent = formatar(Math.round(destino * suavizado));
            if (p < 1) requestAnimationFrame(passo);
            else el.textContent = formatar(destino);
          }
          requestAnimationFrame(passo);
        });
      },
      { threshold: 0.4 }
    );
    alvos.forEach(function (el) { obs.observe(el); });
  })();

  /* ---------------------------------------------------------------------
     5. Serviços: acordeão acessível + painel de imagem no desktop
     --------------------------------------------------------------------- */
  (function servicos() {
    var lista = $('[data-servicos]');
    if (!lista) return;

    var botoes = $$('.servico', lista);
    var palco = $('.servicos__palco');
    var legenda = $('[data-palco-legenda]');

    function trocarPalco(nome) {
      if (!palco || !nome) return;
      $$('img[data-palco]', palco).forEach(function (img) {
        img.classList.toggle('ativa', img.getAttribute('data-palco') === nome);
      });
    }

    botoes.forEach(function (botao) {
      var detalhe = document.getElementById(botao.getAttribute('aria-controls'));
      if (!detalhe) return;

      botao.addEventListener('click', function () {
        var abrindo = botao.getAttribute('aria-expanded') !== 'true';

        // Fecha os outros: um detalhe aberto por vez mantém o ritmo da lista
        botoes.forEach(function (outro) {
          if (outro === botao) return;
          outro.setAttribute('aria-expanded', 'false');
          var d = document.getElementById(outro.getAttribute('aria-controls'));
          if (d) d.classList.remove('aberto');
        });

        botao.setAttribute('aria-expanded', abrindo ? 'true' : 'false');
        detalhe.classList.toggle('aberto', abrindo);

        if (abrindo) trocarPalco(botao.getAttribute('data-imagem'));
      });

      // Ao passar o mouse no desktop o painel acompanha, sem abrir o texto
      botao.addEventListener('mouseenter', function () {
        trocarPalco(botao.getAttribute('data-imagem'));
      });
    });

    // Estado inicial do painel: primeiro serviço
    if (botoes.length) trocarPalco(botoes[0].getAttribute('data-imagem'));
    if (legenda && botoes.length) legenda.textContent = $('.servico__nome', botoes[0]).textContent;
    botoes.forEach(function (b) {
      var d = document.getElementById(b.getAttribute('aria-controls'));
      var nome = $('.servico__nome', b);
      if (!nome) return;
      b.addEventListener('click', function () {
        if (legenda) legenda.textContent = nome.textContent;
      });
      if (d) d.dataset.nome = nome.textContent;
    });
  })();

  /* ---------------------------------------------------------------------
     6. Dica "arraste para o lado" — só aparece se realmente houver overflow
     --------------------------------------------------------------------- */
  (function dicaArrastar() {
    var dicas = $$('[data-arrastar]');
    if (!dicas.length) return;
    dicas.forEach(function (trilho) {
      var dica = trilho.parentElement ? $('.arrastar-dica', trilho.parentElement) : null;
      if (!dica) {
        var secao = trilho.closest('.procedimentos');
        dica = secao ? $('.arrastar-dica', secao) : null;
      }
      if (!dica) return;
      var verificar = function () {
        var temOverflow = trilho.scrollWidth - trilho.clientWidth > 24;
        dica.hidden = !temOverflow;
      };
      verificar();
      window.addEventListener('resize', verificar, { passive: true });
    });
  })();

  /* ---------------------------------------------------------------------
     7. AGENDAMENTO — demonstração navegável
     Nenhum dado sai do navegador. Nada é enviado, nada é armazenado.
     --------------------------------------------------------------------- */

  // Serviços reais do salão. A duração é apenas uma estimativa de agenda
  // para a demonstração funcionar — não é informação institucional.
  var SERVICOS = [
    { id: 'alisamento',  nome: 'Alisamento',                  nota: 'A especialidade da casa',      duracao: 180 },
    { id: 'tratamento',  nome: 'Tratamento personalizado',    nota: 'Protocolo montado para o fio', duracao: 90 },
    { id: 'cronograma',  nome: 'Cronograma capilar',          nota: 'Etapas ao longo do tempo',     duracao: 120 },
    { id: 'lavagem',     nome: 'Lavagem e hidratação',        nota: 'Com massagem no couro',        duracao: 60 },
    { id: 'oleo',        nome: 'Óleo perfumado',              nota: 'Finalização com fragrância',   duracao: 30 },
    { id: 'sos',         nome: 'Cabelo S.O.S',                nota: 'Cuidado imediato do fio',      duracao: 90 },
    { id: 'detox',       nome: 'Detox capilar',               nota: 'Limpeza profunda',             duracao: 60 },
    { id: 'avaliacao',   nome: 'Avaliação do fio',            nota: 'Antes de qualquer protocolo',  duracao: 30 }
  ];

  var DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

  // Grade de horários: 9h às 18h, em intervalos de 30 min.
  var HORARIOS;
  (function gerarHorarios() {
    HORARIOS = [];
    for (var h = 9; h <= 18; h++) {
      HORARIOS.push(h + ':00');
      if (h < 18) HORARIOS.push(h + ':30');
    }
  })();

  (function agendamento() {
    var raiz = $('[data-agendamento]');
    if (!raiz) return;

    var etapaAtual = 1;
    var TOTAL = 5;
    var estado = { servico: null, data: null, horario: null, nome: '', whatsapp: '', observacoes: '' };
    var mesVisivel = null;          // Date apontando para o dia 1 do mês exibido
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    var contador1 = $('[data-contador]', raiz);
    var contador2 = $('[data-contador2]', raiz);
    var marcas = $$('.passo-marca', raiz);
    var etapas = $$('.painel__etapa', raiz);
    var btnAvancar = $('[data-avancar]', raiz);
    var btnVoltar = $('[data-voltar]', raiz);
    var escolhasServico = $('[data-escolhas-servico]', raiz);
    var rotuloMes = $('[data-mes]', raiz);
    var caixaDias = $('[data-dias]', raiz);
    var caixaHorarios = $('[data-horarios]', raiz);
    var formulario = $('[data-formulario]', raiz);
    var caixaResumo = $('[data-resumo]', raiz);

    mesVisivel = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    /* -- Utilidades de data ------------------------------------------- */
    function mesmoDia(a, b) {
      return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }
    function formatarDataLonga(d) {
      return DIAS_SEMANA_CURTO[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
    }
    function chaveData(d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    /* -- Etapa 1: serviços -------------------------------------------- */
    SERVICOS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'escolha';
      b.setAttribute('aria-pressed', 'false');
      b.dataset.servico = s.id;
      b.innerHTML =
        '<span class="escolha__ponto" aria-hidden="true"></span>' +
        '<span><b>' + s.nome + '</b><span>' + s.nota + '</span></span>';
      b.addEventListener('click', function () {
        estado.servico = s;
        $$('.escolha', escolhasServico).forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        limparErro(1);
      });
      escolhasServico.appendChild(b);
    });

    /* -- Etapa 2: calendário ------------------------------------------ */
    // Um dia só é oferecido se ainda tiver pelo menos um horário livre.
    // Sem isso, quem abrisse a demonstração depois das 18h escolheria "hoje"
    // e cairia num estado vazio logo na primeira interação.
    function temVaga(data) {
      if (data.getDay() === 0) return false;
      var ehHoje = mesmoDia(data, hoje);
      var horaAgora = new Date().getHours();
      for (var i = 0; i < HORARIOS.length; i++) {
        var h = HORARIOS[i];
        if (ocupadoNaData(data, h)) continue;
        if (ehHoje && parseInt(h, 10) <= horaAgora) continue;
        return true;
      }
      return false;
    }

    function desenharMes() {
      var ano = mesVisivel.getFullYear();
      var mes = mesVisivel.getMonth();
      rotuloMes.textContent = MESES[mes] + ' ' + ano;

      var primeiroDiaSemana = new Date(ano, mes, 1).getDay();
      var totalDias = new Date(ano, mes + 1, 0).getDate();

      caixaDias.innerHTML = '';

      for (var v = 0; v < primeiroDiaSemana; v++) {
        var vazio = document.createElement('span');
        vazio.className = 'dia dia--vazio';
        vazio.setAttribute('aria-hidden', 'true');
        caixaDias.appendChild(vazio);
      }

      for (var d = 1; d <= totalDias; d++) {
        var data = new Date(ano, mes, d);
        var botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'dia';
        botao.textContent = String(d);
        botao.setAttribute('aria-pressed', 'false');
        botao.setAttribute('aria-label', formatarDataLonga(data));

        // Regras reais: domingo fechado, passado indisponível, e só entra no
        // calendário o dia que ainda tem vaga na agenda.
        var fechado = data.getDay() === 0;
        var passado = data < hoje;
        var semVaga = !fechado && !passado && !temVaga(data);
        botao.disabled = fechado || passado || semVaga;
        if (fechado) botao.title = 'Domingo — fechado';
        else if (passado) botao.title = 'Data já passou';
        else if (semVaga) botao.title = 'Sem horários livres nesta data';

        if (estado.data && mesmoDia(data, estado.data)) botao.setAttribute('aria-pressed', 'true');

        (function (dataRef, el) {
          el.addEventListener('click', function () {
            estado.data = dataRef;
            estado.horario = null;         // trocar o dia invalida o horário
            $$('.dia', caixaDias).forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
            el.setAttribute('aria-pressed', 'true');
            limparErro(2);
          });
        })(data, botao);

        caixaDias.appendChild(botao);
      }

      // O mês atual é o piso: não dá para voltar para trás dele.
      var botaoAnterior = $('[data-mes-anterior]', raiz);
      var mesAtualReal = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      botaoAnterior.disabled = mesVisivel <= mesAtualReal;
    }

    $('[data-mes-anterior]', raiz).addEventListener('click', function () {
      mesVisivel = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth() - 1, 1);
      desenharMes();
    });
    $('[data-mes-seguinte]', raiz).addEventListener('click', function () {
      mesVisivel = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth() + 1, 1);
      desenharMes();
    });

    /* -- Etapa 3: horários ------------------------------------------- */
    // Ocupação pseudo-aleatória, mas estável: depende só da data.
    // Serve para a demonstração parecer verossímil, sem depender de backend.
    function ocupadoNaData(data, hora) {
      var semente = (data.getFullYear() * 372 + (data.getMonth() + 1) * 31 + data.getDate()) * 7;
      var idx = HORARIOS.indexOf(hora);
      var marca = (semente + idx * 13) % 10;
      return marca < 3;   // ~30% da agenda aparece ocupada
    }

    function desenharHorarios() {
      caixaHorarios.innerHTML = '';

      if (!estado.data) {
        var aviso = document.createElement('p');
        aviso.className = 'aviso-vazio';
        aviso.textContent = 'Escolha uma data para ver os horários disponíveis.';
        caixaHorarios.appendChild(aviso);
        return;
      }

      var ehHoje = mesmoDia(estado.data, hoje);
      var horaAgora = new Date().getHours();
      var encontrouAlgum = false;

      HORARIOS.forEach(function (hora) {
        var botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'horario';
        botao.textContent = hora;
        botao.setAttribute('aria-pressed', 'false');

        var indisp = ocupadoNaData(estado.data, hora);
        // No dia de hoje, horários já passados não aparecem disponíveis.
        if (ehHoje && parseInt(hora, 10) <= horaAgora) indisp = true;

        botao.disabled = indisp;
        if (indisp) botao.title = 'Horário indisponível';

        if (estado.horario === hora) botao.setAttribute('aria-pressed', 'true');
        if (!indisp) encontrouAlgum = true;

        botao.addEventListener('click', function () {
          estado.horario = hora;
          $$('.horario', caixaHorarios).forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
          botao.setAttribute('aria-pressed', 'true');
          limparErro(3);
        });

        caixaHorarios.appendChild(botao);
      });

      if (!encontrouAlgum) {
        caixaHorarios.innerHTML = '';
        var semVaga = document.createElement('p');
        semVaga.className = 'aviso-vazio';
        semVaga.textContent = 'Não há horários livres nesta data na demonstração. Tente outro dia.';
        caixaHorarios.appendChild(semVaga);
      }
    }

    /* -- Etapa 5: resumo --------------------------------------------- */
    function desenharResumo() {
      caixaResumo.innerHTML = '';
      var linhas = [
        ['Serviço', estado.servico ? estado.servico.nome : '—'],
        ['Duração estimada', estado.servico ? estado.servico.duracao + ' minutos' : '—'],
        ['Data', estado.data ? formatarDataLonga(estado.data) : '—'],
        ['Horário', estado.horario || '—'],
        ['Nome', estado.nome || '—'],
        ['WhatsApp', estado.whatsapp || '—']
      ];
      if (estado.observacoes) linhas.push(['Observações', estado.observacoes]);

      linhas.forEach(function (par) {
        var linha = document.createElement('div');
        linha.className = 'resumo__linha';
        var dt = document.createElement('dt');
        dt.textContent = par[0];
        var dd = document.createElement('dd');
        dd.textContent = par[1];
        linha.appendChild(dt);
        linha.appendChild(dd);
        caixaResumo.appendChild(linha);
      });
    }

    /* -- Erros ------------------------------------------------------- */
    function mostrarErro(etapa, mensagem) {
      var alvo = $('[data-erro="' + etapa + '"]', raiz);
      if (alvo) alvo.textContent = mensagem;
    }
    function limparErro(etapa) {
      var alvo = $('[data-erro="' + etapa + '"]', raiz);
      if (alvo) alvo.textContent = '';
    }

    /* -- Validação --------------------------------------------------- */
    function validarEtapa(etapa) {
      if (etapa === 1) {
        if (!estado.servico) { mostrarErro(1, 'Escolha um serviço para continuar.'); return false; }
        limparErro(1); return true;
      }
      if (etapa === 2) {
        if (!estado.data) { mostrarErro(2, 'Escolha uma data para continuar.'); return false; }
        limparErro(2); return true;
      }
      if (etapa === 3) {
        if (!estado.horario) { mostrarErro(3, 'Escolha um horário para continuar.'); return false; }
        limparErro(3); return true;
      }
      if (etapa === 4) {
        var ok = true;
        var nome = $('#nome', raiz);
        var tel = $('#whatsapp', raiz);
        var erroNome = $('[data-erro-campo="nome"]', raiz);
        var erroTel = $('[data-erro-campo="whatsapp"]', raiz);

        if (!nome.value.trim() || nome.value.trim().length < 2) {
          erroNome.textContent = 'Informe seu nome.';
          nome.parentElement.dataset.invalido = 'true';
          ok = false;
        } else {
          erroNome.textContent = '';
          delete nome.parentElement.dataset.invalido;
          estado.nome = nome.value.trim();
        }

        var digitos = tel.value.replace(/\D/g, '');
        if (digitos.length < 10 || digitos.length > 11) {
          erroTel.textContent = 'Informe um WhatsApp com DDD.';
          tel.parentElement.dataset.invalido = 'true';
          ok = false;
        } else {
          erroTel.textContent = '';
          delete tel.parentElement.dataset.invalido;
          estado.whatsapp = tel.value.trim();
        }

        estado.observacoes = $('#observacoes', raiz).value.trim();
        return ok;
      }
      return true;
    }

    /* -- Navegação --------------------------------------------------- */
    function irPara(etapa) {
      etapaAtual = etapa;
      etapas.forEach(function (e) {
        e.classList.toggle('ativa', Number(e.getAttribute('data-etapa')) === etapa);
      });
      marcas.forEach(function (m) {
        var n = Number(m.getAttribute('data-passo'));
        if (n === etapa) m.setAttribute('data-estado', 'atual');
        else if (n < etapa) m.setAttribute('data-estado', 'feito');
        else m.removeAttribute('data-estado');
      });
      var texto = 'Passo ' + etapa + ' de ' + TOTAL;
      if (contador1) contador1.textContent = texto;
      if (contador2) contador2.textContent = texto;
      if (btnVoltar) btnVoltar.hidden = etapa === 1;
      if (btnAvancar) {
        var rotulo = $('span', btnAvancar);
        if (rotulo) rotulo.textContent = etapa === TOTAL ? 'Confirmar agendamento' : (etapa === 4 ? 'Ver resumo' : 'Continuar');
      }
      if (etapa === 3) desenharHorarios();
      if (etapa === 5) desenharResumo();
    }

    if (btnAvancar) {
      btnAvancar.addEventListener('click', function () {
        if (!validarEtapa(etapaAtual)) return;
        if (etapaAtual === TOTAL) {
          // Demonstração: nada é enviado, nada é armazenado.
          var rotulo = $('span', btnAvancar);
          if (rotulo) rotulo.textContent = 'Demonstração — nada foi enviado';
          btnAvancar.disabled = true;
          return;
        }
        irPara(etapaAtual + 1);
      });
    }

    if (btnVoltar) {
      btnVoltar.addEventListener('click', function () {
        if (etapaAtual > 1) irPara(etapaAtual - 1);
      });
    }

    /* -- Máscara de WhatsApp: agrupa enquanto digita, sem perder dígito --
       Fixo (10 díg.) → (81) 3429-1234 · Celular (11 díg.) → (81) 99814-3879 */
    var campoTelefone = $('#whatsapp', raiz);
    if (campoTelefone) {
      campoTelefone.addEventListener('input', function () {
        var d = campoTelefone.value.replace(/\D/g, '').slice(0, 11);
        var saida = '';
        if (d.length === 0)      saida = '';
        else if (d.length <= 2)  saida = '(' + d;
        else if (d.length <= 6)  saida = '(' + d.slice(0, 2) + ') ' + d.slice(2);
        else if (d.length <= 10) saida = '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
        else                     saida = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
        campoTelefone.value = saida;
      });
    }

    if (formulario) {
      formulario.addEventListener('submit', function (e) { e.preventDefault(); });
    }

    /* -- Inicialização ----------------------------------------------- */
    desenharMes();
    irPara(1);
  })();

  /* ---------------------------------------------------------------------
     8. Rolagem suave com fallback para navegadores sem scroll-behavior:
     respeita a preferência de movimento e não sequestra a rolagem.
     --------------------------------------------------------------------- */
  (function ancoras() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute('href');
      if (!id || id === '#') return;
      var alvo = document.getElementById(id.slice(1));
      if (!alvo) return;

      e.preventDefault();
      var topo = alvo.getBoundingClientRect().top + window.pageYOffset
               - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--altura-cabecalho'), 10) || 72) - 16;

      window.scrollTo({ top: topo, behavior: movimentoReduzido.matches ? 'auto' : 'smooth' });

      // Mantém o foco coerente para leitores de tela e navegação por teclado
      alvo.setAttribute('tabindex', '-1');
      alvo.focus({ preventScroll: true });

      // Atualiza a URL sem provocar um segundo salto
      if (history.replaceState) history.replaceState(null, '', id);
    });
  })();

})();
