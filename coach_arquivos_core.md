# Lógica Principal, Regras e IA (Engine)

* [coachLogic.js](src/utils/coachLogic.js) - O motor central de regras e decisões.
* [coachAdaptive.js](src/utils/coachAdaptive.js) - Responsável por adaptar o tom, as métricas e sugestões com base na performance do aluno.
* [coachText.js](src/utils/coachText.js) - Gerador e repositório de textos/copys utilizados pelo Coach.
* [coachSafe.js](src/utils/coachSafe.js) - Mecanismos de fallback (segurança) da IA.
* [coachBacktest.js](src/utils/coachBacktest.js) - Utilitário para rodar cenários simulados (backtesting) de decisões.
* [explanationEngine.js](src/utils/explanationEngine.js) - Motor de explicações inteligentes.
* [insightGenerator.js](src/engine/insightGenerator.js) - Extração de insights de alto nível dos dados dos estudantes.

# Matemática, Calibração e Adaptação
Arquivos focados nas fórmulas, pesos matemáticos e calibração fina das recomendações adaptativas.

* [adaptiveMath.js](src/utils/adaptiveMath.js) - Cálculos matemáticos puros para detecção de fadiga, momentum, etc.
* [adaptiveEngine.js](src/utils/adaptiveEngine.js) - Orquestra a adaptação do algoritmo usando a matemática base.
* [calibration.js](src/utils/calibration.js) - Central de parâmetros de calibração do sistema (limiares de confiança, peso de revisões).
* [calibrationTelemetry.js](src/utils/calibrationTelemetry.js) - Dispara ou registra dados quando limites de calibração são atingidos.
* [ProgressStateEngine.js](src/utils/ProgressStateEngine.js) - Gerencia e calibra o estado de progresso com base na curva de evolução.
