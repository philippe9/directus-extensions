export default (router, context) => {
  const { services, getSchema, env } = context;
  const { ItemsService, MailService } = services;
  router.post("/auth/verify-email", async (req, res) => {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({
        error: "Token et email requis",
      });
    }

    try {
      const schema = await getSchema();
      const usersService = new ItemsService("directus_users", {
        schema,
        accountability: null,
      });

      // Trouver l'utilisateur avec ce token
      const users = await usersService.readByQuery({
        filter: {
          email: { _eq: email },
          verification_token: { _eq: token },
        },
        limit: 1,
      });

      if (!users || users.length === 0) {
        return res.status(400).json({
          error: "Token invalide ou expiré",
        });
      }

      const user = users[0];

      // Activer l'utilisateur
      await usersService.updateOne(user.id, {
        email_verified: false,
        verification_token: null,
      });

      res.json({
        success: true,
        message: "Email vérifié avec succès",
      });
    } catch (error) {
      console.error("Erreur vérification email:", error);
      res.status(500).json({
        message: "Erreur serveur",
        error,
      });
    }
  });

  router.post("/auth/update-user-password", async (req, res) => {
    const { token, email, password } = req.body;

    if (!token || !email) {
      return res.status(400).json({
        error: "Token et email requis",
      });
    }

    try {
      const schema = await getSchema();
      const usersService = new ItemsService("directus_users", {
        schema,
        accountability: null,
      });

      // Trouver l'utilisateur avec ce token
      const users = await usersService.readByQuery({
        filter: {
          email: { _eq: email },
          verification_token: { _eq: token },
        },
        limit: 1,
      });

      if (!users || users.length === 0) {
        return res.status(400).json({
          error: "Token invalide ou expiré",
        });
      }

      const user = users[0];

      // Activer l'utilisateur
      await usersService.updateOne(user.id, {
        status: "active",
        verification_token: null,
        password: password,
      });

      res.json({
        success: true,
        message: "Mot de passe mis à jour avec succès",
      });
    } catch (error) {
      console.error("Erreur vérification email:", error);
      res.status(500).json({
        message: "Erreur serveur",
        error,
      });
    }
  });
  router.get("/auth/init-forgotten-password", async (req, res) => {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        error: "Email requis",
      });
    }
    try {
      const schema = await getSchema();
      const usersService = new ItemsService("directus_users", {
        schema,
        accountability: null,
      });

      // Trouver l'utilisateur avec ce token
      const users = await usersService.readByQuery({
        filter: {
          email: { _eq: email },
        },
        limit: 1,
      });
      if (!users || users.length === 0) {
        return res.status(400).json({
          error: "Token invalide ou expiré",
        });
      }

      const user = users[0];
      
      let token = "";
      const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let charactersLength = characters.length;
      for (let i = 0; i < 6; i++) {
        token += characters.charAt(
          Math.floor(Math.random() * charactersLength)
        );
      }
      await usersService.updateOne(user.id, {
        verification_token: token,
      });
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
              Bienvenue ${user.first_name} ${user.last_name} !
            </h2>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6">
              Nous avons re&ccedil;u une demande de r&eacute;initialisation de votre
              mot de passe. Utilisez le code ci-dessous pour r&eacute;initialiser
              votre mot de passe :
            </p>
            <div style="text-align: center; margin: 30px 0">
              <h3>${token}</h3>
            </div>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6">
              ou en cliquant sur le lien suivant :
            </p>
            <div style="text-align: center; margin: 30px 0">
              <a href="${env.DASHBOARD_URL}/authentication/verify-forgotten-password?token=${token}&email=${user.email}">Lien de r&eacute;initialisation</a>
            </div>
            <p style="color: #718096; font-size: 14px; margin-top: 30px">
              Si vous n'avez pas cr&eacute;&eacute; de compte, vous pouvez ignorer cet
              email.
            </p>
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
        subject:
          "Reinitialisation de votre mode de passe - Plateforme Clinic O",
        html: htmlTemplate,
      });

      console.log(`Email de vérification envoyé à ${user.email}`);
      res.json({
        success: true,
        message: "Email de réinitialisation envoyé",
      });
    } catch (error) {
      console.error("Erreur vérification email:", error);
      res.status(500).json({
        message: "Erreur serveur",
        error,
      });
    }
  });
};
