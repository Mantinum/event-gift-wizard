import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StepIndicator } from '@/components/StepIndicator';
import { ArrowRight, Calendar, ArrowLeft } from 'lucide-react';

const Birthday = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');

  const relationship = sessionStorage.getItem('onboarding-relationship') || '';

  const handleNext = () => {
    if (name && birthday) {
      sessionStorage.setItem('onboarding-name', name);
      sessionStorage.setItem('onboarding-birthday', birthday);
      navigate('/preferences');
    }
  };

  const handleBack = () => {
    navigate('/gift-for');
  };

  const getAgeFromBirthday = (birthdayStr: string) => {
    if (!birthdayStr) return null;
    const today = new Date();
    const birthDate = new Date(birthdayStr);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const age = getAgeFromBirthday(birthday);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Parlez-nous de votre {relationship.toLowerCase()}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ces informations nous permettront de personnaliser nos suggestions
          </p>
        </div>

        <StepIndicator 
          currentStep={2} 
          totalSteps={4} 
          stepTitles={['Qui ?', 'Anniversaire', 'Goûts', 'Suggestions']} 
        />

        <div className="max-w-2xl mx-auto">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Prénom</Label>
                <Input
                  id="name"
                  placeholder="ex: Marie, Pierre, Léa..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthday">Date de naissance</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="text-lg"
                />
                {age !== null && age >= 0 && (
                  <p className="text-sm text-muted-foreground">
                    {name || 'Cette personne'} {age === 0 ? 'a moins d\'un an' : 
                    age === 1 ? 'a 1 an' : `a ${age} ans`}
                  </p>
                )}
              </div>

              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Pourquoi ces informations ?</strong><br/>
                  L'âge nous aide à proposer des cadeaux adaptés, et le prénom personnalise l'expérience.
                  Vos données sont privées et sécurisées.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between mt-8">
            <Button
              onClick={handleBack}
              variant="outline"
              size="lg"
              className="px-8 py-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!name || !birthday}
              size="lg"
              className="bg-gradient-primary text-white px-8 py-4 text-lg shadow-elegant hover:shadow-glow hover:scale-105 transition-all duration-300"
            >
              Continuer
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Birthday;