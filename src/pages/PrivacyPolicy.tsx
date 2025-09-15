import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Sparkles } from 'lucide-react';

const PrivacyPolicy = () => {
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
              Politique de Confidentialité
            </h1>
            
            <p className="text-muted-foreground mb-8 text-lg">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
            </p>

            <div className="prose prose-lg max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  1. Introduction
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Cadofy.com ("nous", "notre" ou "nos") exploite le site web cadofy.com (le "Service"). 
                  Cette page vous informe de nos politiques concernant la collecte, l'utilisation et 
                  la divulgation des données personnelles lorsque vous utilisez notre Service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  2. Programme Partenaires Amazon
                </h2>
                <div className="bg-primary/10 border-l-4 border-primary p-4 rounded-r-lg mb-4">
                  <p className="text-foreground font-medium mb-2">
                    Déclaration d'affiliation Amazon :
                  </p>
                  <p className="text-muted-foreground">
                    En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant 
                    les conditions requises. Cadofy.com participe au Programme Partenaires d'Amazon EU, 
                    un programme d'affiliation conçu pour permettre à des sites de percevoir une 
                    rémunération grâce à la création de liens vers Amazon.fr.
                  </p>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Lorsque vous cliquez sur des liens vers des produits Amazon depuis notre site, 
                  Amazon peut utiliser des cookies et des technologies similaires pour suivre votre 
                  navigation et vos achats. Ces données sont collectées et traitées par Amazon 
                  selon leur propre politique de confidentialité.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  3. Collecte et Utilisation des Données
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Nous collectons plusieurs types d'informations à des fins diverses pour vous 
                  fournir et améliorer notre Service :
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Informations personnelles (nom, email, préférences)</li>
                  <li>Données sur les profils de vos proches (avec votre consentement)</li>
                  <li>Informations d'utilisation et analytics</li>
                  <li>Cookies et données de navigation</li>
                  <li>Données de géolocalisation (si autorisée)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  4. Cookies et Technologies Similaires
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Nous utilisons des cookies et des technologies similaires pour :
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Améliorer votre expérience utilisateur</li>
                  <li>Analyser l'utilisation de notre site</li>
                  <li>Personnaliser les recommandations de cadeaux</li>
                  <li>Suivre les commissions d'affiliation Amazon</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  5. Vos Droits (RGPD)
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Conformément au Règlement Général sur la Protection des Données (RGPD), 
                  vous disposez des droits suivants :
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Droit d'accès :</strong> Consulter vos données personnelles</li>
                  <li><strong>Droit de rectification :</strong> Corriger des informations inexactes</li>
                  <li><strong>Droit à l'effacement :</strong> Supprimer vos données personnelles</li>
                  <li><strong>Droit à la portabilité :</strong> Récupérer vos données</li>
                  <li><strong>Droit d'opposition :</strong> Vous opposer au traitement</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  6. Sécurité des Données
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  La sécurité de vos données personnelles est importante pour nous. Nous utilisons 
                  des mesures de sécurité commercialement acceptables pour protéger vos informations, 
                  incluant le chiffrement des données sensibles et l'authentification sécurisée.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  7. Conservation des Données
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Nous conservons vos données personnelles aussi longtemps que nécessaire pour 
                  vous fournir le Service et respecter nos obligations légales. Les profils 
                  inactifs peuvent être archivés après 24 mois d'inactivité.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  8. Contact
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Pour toute question concernant cette Politique de Confidentialité ou pour 
                  exercer vos droits, contactez-nous à : 
                  <span className="text-primary font-medium"> privacy@cadofy.com</span>
                </p>
              </section>
            </div>
          </CardContent>
        </Card>

        {/* Legal Navigation */}
        <div className="flex justify-center space-x-4 mt-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/terms-of-service')}
          >
            Conditions d'Utilisation
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

export default PrivacyPolicy;