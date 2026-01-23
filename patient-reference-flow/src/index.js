export default ({ action }, { services, exceptions, database, getSchema, env }) => {
  // filter('items.create', () => {
  // 	console.log('Creating Item!');
  // });
  action("patientreference.items.create", async (meta, context) => {
    console.log("Item created!");
    console.log(meta);
    const payloadData = meta.payload;
    // const { services, getSchema, env, database } = context;
    const { ItemsService, MailService } = services;
    try {
      const schema = await getSchema();
      const usersService = new ItemsService("directus_users", {
        schema,
        accountability: context.accountability || null,
      });

      // Trouver les utilisateurs cible
      const users = await usersService.readByQuery({
        filter: {
          health_center: { _eq: payloadData.referedcenter },
          _or: [
            { role: { _eq: "82fcd0bf-e8a1-4c0f-871d-bc14620a444a" } },
            { role: { _eq: "8be2755a-b306-427b-ad6c-1509b422abe5" } },
          ],
        },
      });
      if (!users || users.length === 0) {
        console.log("Aucun utilisateur trouvé pour le centre de santé référé.");
      }
      // Créer les notifications
      const notificationsService = new ItemsService("directus_notifications", {
        schema,
        knex: database,
      });

      for (const user of users) {
        await notificationsService.createOne({
          recipient: user.id,
          subject: "Nouvelle référence de patient",
          message: `Référence de patient a été créée pour votre centre de santé.`,
          collection: "patientreference",
          item: meta.key,
          status: "inbox",
        });
        // ${payload.householdmemberid.first_name} ${payload.householdmemberid.last_name} !
        const htmlTemplate = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto">
              <div
                style="
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  padding: 40px;
                  text-align: center;
                "
              >
                <h1 style="color: white; margin: 0">Plateforme Clinic O</h1>
              </div>
              <div style="padding: 40px; background: #f7fafc">
                <h2 style="color: #2d3748; margin-bottom: 20px">
                  Reference du client 
                </h2>
                <p style="color: #4a5568; font-size: 16px; line-height: 1.6">
                  Une nouvelle r&eacute;f&eacute;rence de patient a &eacute;t&eacute; cr&eacute;&eacute;e pour votre centre de sant&eacute;.
                </p>
                <p style="color: #4a5568; font-size: 16px; line-height: 1.6">
                  ou en cliquant sur le lien suivant :
                </p>
                <div style="text-align: center; margin: 30px 0">
                  <h3><a href="${env.DASHBOARD_URL}/admin/patient/${payloadData.householdmemberid}">Lien vers le client</a></h3>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0" />
                <p style="color: #a0aec0; font-size: 12px">
                  &copy; 2026 Plateforme Clinic O. Tous droits r&eacute;serv&eacute;s.
                </p>
              </div>
            </div>
          `;
        const mailService = new MailService({ schema, accountability: null });
        await mailService.send({
          to: user.email,
          subject: "Nouvelle référence de patient - Plateforme Clinic O",
          html: htmlTemplate,
        });

        console.log(`Email de référence envoyé à ${user.email}`);
      }
      return payloadData;
    } catch (error) {
      console.error("Erreur référence email:", error);
      throw error;
    }
  });
};
