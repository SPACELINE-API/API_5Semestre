INSERT INTO service_order_email_templates (key, subject, body_html)
VALUES (
    'translator_invite',
    'Novo serviço de tradução disponível',
    '<p>Olá, {{nome_tradutor}}!</p><p>Você foi convidado(a) para um novo serviço de tradução.</p><ul><li><strong>Idiomas:</strong> {{idioma_origem}} → {{idioma_destino}}</li><li><strong>Tipo de documento:</strong> {{tipo_documento}}</li><li><strong>Prazo:</strong> {{prazo}}</li></ul><p><a href="{{link_convite}}">Ver documento e responder ao convite</a></p><p>Atenciosamente,<br><strong>Equipe Aliança Traduções</strong></p>'
)
ON CONFLICT (key) DO NOTHING;
