import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Sparkles } from 'lucide-react';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">Cadofy.com</span>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Card className="shadow-card">
          <CardContent className="p-8 md:p-12">
            <h1 className="text-4xl font-bold text-foreground mb-8">
              Conditions d'Utilisation
            </h1>
            
            <p className="text-muted-foreground mb-8 text-lg">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>

            <div className="prose prose-lg max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  1. Acceptation des Conditions
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  En utilisant Cadofy.com, vous acceptez d'être lié par ces Conditions d'Utilisation. 
                  Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  2. Description du Service
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Cadofy.com est un assistant intelligent qui vous aide à planifier et à offrir 
                  des cadeaux personnalisés grâce à l'intelligence artificielle. Le service 
                  comprend la gestion de profils, la planification d'événements et les 
                  suggestions de cadeaux automatisées.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  3. Liens d'Affiliation et Commissions
                </h2>
                <div className="bg-warning/10 border-l-4 border-warning p-4 rounded-r-lg mb-4">
                  <p className="text-foreground font-medium mb-2">
                    Transparence sur les revenus :
                  </p>
                  <p className="text-muted-foreground">
                    Cadofy.com contient des liens d'affiliation vers des plateformes d'achat, 
                    notamment Amazon. Lorsque vous effectuez un achat via ces liens, nous 
                    pouvons recevoir une commission sans coût supplémentaire pour vous.
                  </p>
                </div>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Les prix des produits ne sont pas affectés par notre commission</li>
                  <li>Nous recommandons uniquement des produits pertinents pour vos besoins</li>
                  <li>Vous n'êtes jamais obligé d'acheter via nos liens</li>
                  <li>Les prix peuvent changer après notre dernière vérification</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  4. Compte Utilisateur et Responsabilités
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Pour utiliser certaines fonctionnalités, vous devez créer un compte. 
                  Vous êtes responsable de :
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Maintenir la confidentialité de vos informations de connexion</li>
                  <li>L'exactitude des informations fournies</li>
                  <li>Toutes les activités sous votre compte</li>
                  <li>Respecter les droits de confidentialité des personnes dont vous créez les profils</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  5. Intelligence Artificielle et Suggestions
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Notre IA génère des suggestions basées sur les informations que vous fournissez :
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Les suggestions sont automatisées et peuvent ne pas toujours être parfaites</li>
                  <li>Nous ne garantissons pas la satisfaction du destinataire</li>
                  <li>Vérifiez toujours les détails avant d'effectuer un achat</li>
                  <li>Les budgets et préférences sont des guides, pas des garanties</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  6. Abonnements et Paiements
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Pour les services premium :
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Les abonnements se renouvellent automatiquement</li>
                  <li>Vous pouvez annuler à tout moment depuis votre compte</li>
                  <li>Les remboursements sont soumis à notre politique de remboursement</li>
                  <li>Les prix peuvent être modifiés avec un préavis de 30 jours</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  7. Propriété Intellectuelle
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Cadofy.com et son contenu original sont protégés par des droits de propriété 
                  intellectuelle. Vous ne pouvez pas reproduire, distribuer ou créer des œuvres 
                  dérivées sans notre autorisation écrite expresse.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  8. Limitation de Responsabilité
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Cadofy.com est fourni "en l'état". Nous ne sommes pas responsables des 
                  dommages indirects, des pertes de données ou des problèmes résultant de 
                  l'utilisation de notre service. Notre responsabilité est limitée au montant 
                  payé pour le service au cours des 12 derniers mois.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  9. Résiliation
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Nous nous réservons le droit de suspendre ou de résilier votre compte en 
                  cas de violation de ces conditions. Vous pouvez supprimer votre compte à 
                  tout moment depuis les paramètres de votre profil.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  10. Droit Applicable
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Ces conditions sont régies par le droit français. Tout litige sera soumis 
                  à la juridiction des tribunaux français.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  11. Contact
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Pour toute question concernant ces Conditions d'Utilisation, contactez-nous à : 
                  <span className="text-primary font-medium"> support@cadofy.com</span>
                </p>
              </section>
            </div>
          </CardContent>
        </Card>

        {/* Legal Navigation */}
        <div className="flex justify-center space-x-4 mt-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/privacy-policy')}
          >
            Politique de Confidentialité
          </Button>
          <Button 
            onClick={() => navigate('/')}
            className="bg-gradient-primary text-white"
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;