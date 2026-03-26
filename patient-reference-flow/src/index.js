export default ({ action }, { services, exceptions, database, getSchema, env }) => {
  action("patientreference.items.create", async (meta, context) => {
    console.log("[patientreference.items.create] Event received", {
      key: meta?.key,
      collection: meta?.collection,
      event: meta?.event,
    });
    const payloadData = meta.payload;
    //householdmemberid
    const compoundKey = meta.key + "&&" + payloadData.householdmemberid;
    console.log("[patientreference.items.create] Payload extracted", payloadData);
    // const { services, getSchema, env, database } = context;
    const { ItemsService, MailService } = services;
    try {
      const schema = await getSchema();
      console.log("[patientreference.items.create] Schema loaded");
      const usersService = new ItemsService("directus_users", {
        schema,
        accountability: context.accountability || null,
      });
      //Poste de Santé de APECSY
      const referenceCenter = payloadData.referedcenter;
      console.log("[patientreference.items.create] Resolving recipients", {
        referenceCenter,
        targetRole: "8be2755a-b306-427b-ad6c-1509b422abe5",
      });
      // Trouver les utilisateurs cible
      const users = await usersService.readByQuery({
        filter: {
          health_center: { _eq: referenceCenter },
          _or: [
            { role: { _eq: "8be2755a-b306-427b-ad6c-1509b422abe5" } },
          ],
        },
      });
      console.log("[patientreference.items.create] Recipients query completed", {
        recipientsCount: users?.length || 0,
        recipientIds: (users || []).map((u) => u.id),
      });
      if (!users || users.length === 0) {
        console.log("Aucun utilisateur trouvé pour le centre de santé référé.");
      }
      // Créer les notifications
      const notificationsService = new ItemsService("directus_notifications", {
        schema,
        knex: database,
      });
      console.log("[patientreference.items.create] Notification service ready", {
        item: compoundKey,
      });

      for (const user of users) {
        console.log("[patientreference.items.create] Creating notification", {
          recipient: user?.id,
          recipientEmail: user?.email,
          collection: "patientreference",
          item: compoundKey,
        });
        const notificationId = await notificationsService.createOne({
          recipient: user.id,
          subject: "Nouvelle référence de patient",
          message: `Référence de patient a été créée pour votre centre de santé.`,
          collection: "patientreference",
          item: compoundKey,
          status: "inbox",
        });
        console.log("[patientreference.items.create] Notification created", {
          notificationId,
          recipient: user?.id,
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
                  Reference du patient 
                </h2>
                <p style="color: #4a5568; font-size: 16px; line-height: 1.6">
                  Une nouvelle r&eacute;f&eacute;rence de patient a &eacute;t&eacute; cr&eacute;&eacute;e pour votre centre de sant&eacute;.
                </p>
                <p style="color: #4a5568; font-size: 16px; line-height: 1.6">
                  ou en cliquant sur le lien suivant :
                </p>
                <div style="text-align: center; margin: 30px 0">
                  <h3><a href="${env.DASHBOARD_URL}/admin/patient/${payloadData.householdmemberid}">Lien vers le patient</a></h3>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0" />
                <p style="color: #a0aec0; font-size: 12px">
                  &copy; 2026 Plateforme Clinic O. Tous droits r&eacute;serv&eacute;s.
                </p>
              </div>
            </div>
          `;
        const mailService = new MailService({ schema, accountability: null });
        console.log("[patientreference.items.create] Sending email", {
          to: user?.email,
          dashboardUrl: `${env.DASHBOARD_URL}/admin/patient/${payloadData.householdmemberid}`,
        });
        await mailService.send({
          to: user.email,
          subject: "Nouvelle référence de patient - Plateforme Clinic O",
          html: htmlTemplate,
        });

        console.log(`Email de référence envoyé à ${user.email}`);
      }
      console.log("[patientreference.items.create] Flow completed", {
        item: meta?.key,
        recipientsCount: users?.length || 0,
      });
      return payloadData;
    } catch (error) {
      console.error("Erreur référence email:", error);
      throw error;
    }
  });
};
