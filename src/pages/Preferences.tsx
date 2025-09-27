import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StepIndicator } from '@/components/StepIndicator';
import { INTEREST_CATEGORIES } from '@/types';
import { ArrowRight, ArrowLeft, Sparkles, Heart, User } from 'lucide-react';

const Preferences = () => {
  const navigate = useNavigate();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState<string>('');

  const name = sessionStorage.getItem('onboarding-name') || '';
  const relationship = sessionStorage.getItem('onboarding-relationship') || '';

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleNext = () => {
    if (selectedInterests.length > 0 && selectedGender) {
      sessionStorage.setItem('onboarding-interests', JSON.stringify(selectedInterests));
      sessionStorage.setItem('onboarding-gender', selectedGender);
      navigate('/suggestions');
    }
  };

  const handleBack = () => {
    navigate('/birthday');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Quels sont les goûts de {name} ?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sélectionnez les centres d'intérêt qui correspondent à votre {relationship.toLowerCase()}
          </p>
        </div>

        <StepIndicator 
          currentStep={3} 
          totalSteps={4} 
          stepTitles={['Qui ?', 'Anniversaire', 'Goûts', 'Suggestions']} 
        />

        <div className="max-w-4xl mx-auto">
          <Card className="shadow-elegant mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Informations sur {name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Gender Selection */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-3">
                  Quel est le sexe de {name} ?
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {['Homme', 'Femme'].map((gender) => (
                    <Badge
                      key={gender}
                      variant={selectedGender === gender ? "default" : "outline"}
                      className={`
                        cursor-pointer p-4 text-center text-sm transition-all duration-300 hover:scale-105 h-auto
                        ${selectedGender === gender 
                          ? 'bg-gradient-primary text-white shadow-glow border-primary' 
                          : 'hover:bg-muted/50 hover:border-primary/50'
                        }
                      `}
                      onClick={() => setSelectedGender(gender)}
                    >
                      {gender}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Interests Selection */}
              <div>
                <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Centres d'intérêt de {name}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                  {INTEREST_CATEGORIES.map((interest) => {
                    const isSelected = selectedInterests.includes(interest);
                    
                    return (
                      <Badge
                        key={interest}
                        variant={isSelected ? "default" : "outline"}
                        className={`
                          cursor-pointer p-4 text-center text-sm transition-all duration-300 hover:scale-105 h-auto
                          ${isSelected 
                            ? 'bg-gradient-primary text-white shadow-glow border-primary' 
                            : 'hover:bg-muted/50 hover:border-primary/50'
                          }
                        `}
                        onClick={() => toggleInterest(interest)}
                      >
                        {interest}
                      </Badge>
                    );
                  })}
                </div>

                {selectedInterests.length > 0 && (
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">
                      Intérêts sélectionnés pour {name} :
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedInterests.map((interest) => (
                        <Badge key={interest} variant="secondary" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                <p className="text-sm text-primary font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Plus vous donnez d'informations, plus nos suggestions seront précises !
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
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
              disabled={selectedInterests.length === 0 || !selectedGender}
              size="lg"
              className="bg-gradient-primary text-white px-8 py-4 text-lg shadow-elegant hover:shadow-glow hover:scale-105 transition-all duration-300"
            >
              Voir les suggestions
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preferences;