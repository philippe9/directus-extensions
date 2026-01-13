export default (router, context) => {
  const { services, getSchema } = context;
  const { ItemsService } = services;
  router.get("/auth/verify-email", async (req, res) => {
    const { token, email } = req.query;

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
      });

      res.json({
        success: true,
        message: "Email vérifié avec succès",
      });
    } catch (error) {
      console.error("Erreur vérification email:", error);
      res.status(500).json({
        error: "Erreur serveur",
      });
    }
  });
  router.post("/auth/verify-user-password", async (req, res) => {
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
        error: "Erreur serveur",
      });
    }
  });
};
