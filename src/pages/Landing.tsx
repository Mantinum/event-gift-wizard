import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  Sparkles, 
  Calendar, 
  Users, 
  Brain, 
  Shield, 
  Zap, 
  Heart,
  Star,
  CheckCircle,
  ArrowRight,
  Gift,
  Bell,
  CreditCard,
  Crown
} from 'lucide-react';
import heroImage from '@/assets/hero-calendar.jpg';

const Landing = () => {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: Brain,
      title: "IA Personnalisée",
      description: "Notre intelligence artificielle apprend les goûts de vos proches pour suggérer les cadeaux parfaits",
      color: "text-purple-400"
    },
    {
      icon: Calendar,
      title: "Calendrier Intelligent",
      description: "Planifiez automatiquement tous les événements importants avec des rappels personnalisés",
      color: "text-blue-400"
    },
    {
      icon: Gift,
      title: "Achats Automatiques",
      description: "Commandez automatiquement les cadeaux selon votre budget et les préférences",
      color: "text-green-400"
    },
    {
      icon: Users,
      title: "Profils Détaillés",
      description: "Créez des profils complets avec goûts, allergies, tailles et préférences",
      color: "text-red-400"
    }
  ];

  const testimonials = [
    {
      name: "Marie Dubois",
      role: "Mère de famille",
      content: "Fini les cadeaux ratés ! GiftCalendar connaît mes enfants mieux que moi parfois.",
      rating: 5
    },
    {
      name: "Jean Martin",
      role: "Entrepreneur",
      content: "Indispensable pour quelqu'un comme moi qui voyage beaucoup. Je n'oublie plus jamais un anniversaire.",
      rating: 5
    },
    {
      name: "Sophie Laurent",
      role: "Grand-mère",
      content: "Mes 12 petits-enfants sont tous gâtés au bon moment avec les bons cadeaux. Magique !",
      rating: 5
    }
  ];

  const pricing = [
    {
      name: "Gratuit",
      price: "0€",
      period: "/mois",
      description: "Pour découvrir GiftCalendar",
      features: [
        "Jusqu'à 5 profils",
        "10 événements/mois",
        "Suggestions IA basiques",
        "Support email"
      ],
      buttonText: "Commencer gratuitement",
      buttonVariant: "outline" as const
    },
    {
      name: "Premium",
      price: "9€",
      period: "/mois",
      description: "Pour les familles organisées",
      features: [
        "Profils illimités",
        "Événements illimités", 
        "IA avancée + apprentissage",
        "Achats automatiques",
        "Support prioritaire",
        "Rappels personnalisés"
      ],
      buttonText: "Essayer 30 jours gratuits",
      buttonVariant: "default" as const,
      popular: true
    },
    {
      name: "Famille",
      price: "19€",
      period: "/mois",
      description: "Pour les grandes familles",
      features: [
        "Tout Premium inclus",
        "Partage multi-utilisateurs",
        "Budgets avancés",
        "Analytics détaillées",
        "API intégrations",
        "Support téléphone"
      ],
      buttonText: "Contactez-nous",
      buttonVariant: "outline" as const
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">GiftCalendar</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-foreground hover:text-primary transition-colors">
                Fonctionnalités
              </a>
              <a href="#testimonials" className="text-foreground hover:text-primary transition-colors">
                Témoignages
              </a>
              <a href="#pricing" className="text-foreground hover:text-primary transition-colors">
                Prix
              </a>
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Button 
                variant="ghost" 
                onClick={() => navigate('/auth')}
                className="hidden md:inline-flex"
              >
                Se connecter
              </Button>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-gradient-primary text-white shadow-elegant hover:shadow-glow"
              >
                Commencer
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10">
          <img 
            src={heroImage} 
            alt="GiftCalendar Hero" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
              ✨ L'assistant qui révolutionne vos cadeaux
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-8 leading-tight">
              Ne ratez plus jamais
              <span className="bg-gradient-primary bg-clip-text text-transparent"> un cadeau</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              GiftCalendar utilise l'intelligence artificielle pour vous aider à offrir 
              les cadeaux parfaits au bon moment, automatiquement.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button 
                size="lg"
                onClick={() => navigate('/auth')}
                className="bg-gradient-primary text-white px-8 py-4 text-lg shadow-elegant hover:shadow-glow hover:scale-105 transition-all duration-300"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Commencer gratuitement
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <Button 
                size="lg" 
                variant="outline"
                className="px-8 py-4 text-lg hover:bg-primary/5"
              >
                Voir la démo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-muted-foreground">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Essai gratuit 30 jours</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-500" />
                <span>Données sécurisées</span>
              </div>
              <div className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-red-500" />
                <span>+10,000 familles heureuses</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Fonctionnalités
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Des fonctionnalités conçues pour simplifier votre vie et rendre vos proches heureux
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer group animate-fade-in hover:scale-105"
                style={{ animationDelay: `${index * 100}ms` }}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <CardContent className="p-8 text-center">
                  <div className={`w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-6 group-hover:shadow-glow group-hover:scale-110 transition-all duration-300`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Comment ça marche
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Simple comme bonjour
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-elegant">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Créez des profils</h3>
              <p className="text-muted-foreground">
                Ajoutez vos proches avec leurs goûts, tailles et préférences
              </p>
            </div>

            <div className="text-center animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-elegant">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Planifiez les événements</h3>
              <p className="text-muted-foreground">
                L'IA génère automatiquement les anniversaires et événements importants
              </p>
            </div>

            <div className="text-center animate-fade-in" style={{ animationDelay: '200ms' }}>
              <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-elegant">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Relaxez-vous</h3>
              <p className="text-muted-foreground">
                Recevez des suggestions parfaites et commandez automatiquement
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Témoignages
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Ils nous font confiance
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="shadow-card hover:shadow-elegant transition-all duration-300 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <CardContent className="p-8">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Prix
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Choisissez votre plan
            </h2>
            <p className="text-xl text-muted-foreground">
              Commencez gratuitement, évoluez à votre rythme
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricing.map((plan, index) => (
              <Card 
                key={index}
                className={`shadow-card hover:shadow-elegant transition-all duration-300 animate-fade-in relative ${
                  plan.popular ? 'border-primary shadow-elegant scale-105' : ''
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-primary text-white px-4 py-1">
                      <Crown className="w-4 h-4 mr-1" />
                      Populaire
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    variant={plan.buttonVariant}
                    className={`w-full ${
                      plan.buttonVariant === 'default' 
                        ? 'bg-gradient-primary text-white shadow-elegant hover:shadow-glow' 
                        : ''
                    }`}
                    onClick={() => navigate('/auth')}
                  >
                    {plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground">
              Toutes les formules incluent une garantie satisfait ou remboursé de 30 jours
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Prêt à transformer vos cadeaux ?
            </h2>
            <p className="text-xl mb-12 text-white/90 max-w-2xl mx-auto">
              Rejoignez des milliers de familles qui ne ratent plus jamais un anniversaire 
              et offrent toujours le cadeau parfait.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg"
                onClick={() => navigate('/auth')}
                className="bg-white text-primary px-8 py-4 text-lg hover:bg-white/90 shadow-elegant hover:shadow-glow hover:scale-105 transition-all duration-300"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Commencer maintenant
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <p className="text-white/80 text-sm">
                Gratuit pendant 30 jours • Sans engagement
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold text-foreground">GiftCalendar</span>
            </div>
            
            <div className="flex space-x-6 text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-primary transition-colors">Conditions</a>
              <a href="#" className="hover:text-primary transition-colors">Support</a>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 GiftCalendar. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;