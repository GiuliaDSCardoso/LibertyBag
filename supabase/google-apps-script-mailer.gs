/**
 * =====================================================================================
 * LIBERTYBAG — ENVIADOR DE E-MAIL HTML 100% GRATUITO (GOOGLE APPS SCRIPT + GMAIL)
 * =====================================================================================
 * Substitui o EmailJS gratuitamente (até 100 e-mails por dia / 3.000 por mês de graça!).
 *
 * COMO ATIVAR EM 1 MINUTO:
 * 1. Acesse https://script.google.com e clique em "+ Novo projeto"
 * 2. Apague tudo que estiver lá e cole TODO este código abaixo.
 * 3. No topo direito, clique no botão azul "Implantar" -> "Nova implantação".
 * 4. Na engrenagem ao lado de "Selecionar tipo", escolha "App da Web".
 * 5. Em "Executar como", deixe "Eu (seu e-mail)".
 * 6. Em "Quem pode acessar", escolha "Qualquer pessoa".
 * 7. Clique em "Implantar", autorize sua conta do Google e copie a "URL do app da Web".
 * 8. Cole essa URL no seu arquivo `.env` como:
 *    VITE_FREE_EMAIL_WEBHOOK_URL=https://script.google.com/macros/s/SUA_URL_AQUI/exec
 * =====================================================================================
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var toEmail = data.to_email;
    var toName = data.to_name || 'Família';
    var code = data.verification_code;
    var confirmLink = data.confirm_link;

    var subject = 'Seu código de acesso ao LibertyBag: ' + code;

    var htmlBody = ''
      + '<!DOCTYPE html>'
      + '<html lang="pt-BR"><head><meta charset="UTF-8"></head>'
      + '<body style="margin:0;padding:0;background-color:#FBF6EA;font-family:\'Plus Jakarta Sans\',-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#12206B;">'
      + '  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FBF6EA;padding:32px 16px;">'
      + '    <tr><td align="center">'
      + '      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#FFFFFF;border:3px solid #2346C8;border-radius:28px;overflow:hidden;box-shadow:0 12px 32px rgba(18,32,107,0.10);">'
      + '        <tr>'
      + '          <td style="background-color:#2346C8;padding:28px 32px;text-align:center;">'
      + '            <div style="display:inline-block;background-color:#F8D56B;color:#12206B;font-weight:800;font-size:13px;padding:6px 16px;border-radius:999px;margin-bottom:12px;">'
      + '              ✿ LIBERTYBAG • FINANÇAS EM FAMÍLIA'
      + '            </div>'
      + '            <h1 style="margin:0;font-family:Georgia,\'Times New Roman\',serif;font-style:italic;font-size:30px;color:#FFFFFF;letter-spacing:-0.5px;">'
      + '              Confirme seu acesso'
      + '            </h1>'
      + '          </td>'
      + '        </tr>'
      + '        <tr>'
      + '          <td style="padding:32px 28px;text-align:center;">'
      + '            <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#12206B;">Olá, ' + toName + '! ☀️</p>'
      + '            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#12206B;">'
      + '              Aqui está o seu código de segurança de <strong>6 números</strong> para entrar no <strong>LibertyBag</strong>:'
      + '            </p>'
      + '            <div style="background-color:#FBF6EA;border:2px dashed #2346C8;border-radius:22px;padding:22px 16px;margin:0 auto 24px;max-width:320px;">'
      + '              <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#2346C8;margin-bottom:8px;">SEU CÓDIGO DE 6 DÍGITOS</div>'
      + '              <div style="font-size:38px;font-weight:800;letter-spacing:10px;color:#12206B;font-family:\'Courier New\',Courier,monospace;">' + code + '</div>'
      + '            </div>'
      + '            <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#12206B;">Ou, se preferir entrar com apenas <strong>1 toque</strong>, clique no botão azul abaixo:</p>'
      + '            <div style="margin:0 0 26px;">'
      + '              <a href="' + confirmLink + '" target="_blank" style="display:inline-block;background-color:#2346C8;color:#FFFFFF;text-decoration:none;font-weight:800;font-size:16px;padding:16px 32px;border-radius:999px;">Confirmar meu acesso agora →</a>'
      + '            </div>'
      + '            <hr style="border:none;border-top:1px solid #BFD4F2;margin:24px 0;" />'
      + '            <p style="margin:0;font-size:12px;line-height:1.5;color:#52608F;">Este código vale por <strong>15 minutos</strong>.</p>'
      + '          </td>'
      + '        </tr>'
      + '        <tr>'
      + '          <td style="background-color:#BFD4F2;padding:16px 24px;text-align:center;font-size:12px;font-weight:700;color:#12206B;">'
      + '            LibertyBag • Feito by Giulia Cardoso ✿'
      + '          </td>'
      + '        </tr>'
      + '      </table>'
      + '    </td></tr>'
      + '  </table>'
      + '</body></html>';

    MailApp.sendEmail({
      to: toEmail,
      subject: subject,
      htmlBody: htmlBody,
      name: 'LibertyBag Finanças'
    });

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
