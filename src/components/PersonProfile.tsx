import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Heart, ShoppingBag, Edit, Calendar, Trash2 } from 'lucide-react';
import { getRelationshipColor } from '@/types';

interface Person {
  id: string;
  name: string;
  avatar?: string;
  interests: string[];
  budget: number;
  relationship: string;
  birthday: string;
  lastGift?: string;
  preferredCategories: string[];
}

interface PersonProfileProps {
  person: Person;
  onEdit?: () => void;
  onViewProfile?: () => void;
  onDelete?: () => void;
}

const PersonProfile = ({ person, onEdit, onViewProfile, onDelete }: PersonProfileProps) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <Card className="w-full max-w-md shadow-card hover:shadow-elegant transition-all duration-300 group">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-3">
          <Avatar className="w-20 h-20 border-4 border-gradient-primary shadow-glow">
            <AvatarImage src={person.avatar} alt={person.name} />
            <AvatarFallback className="bg-gradient-primary text-white text-lg font-bold">
              {getInitials(person.name)}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-xl font-bold text-foreground">
          {person.name}
        </CardTitle>
        <Badge variant="secondary" className={`w-fit mx-auto ${getRelationshipColor(person.relationship)}`}>
          <Heart className="w-3 h-3 mr-1" />
          {person.relationship}
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            Anniversaire
          </span>
          <span className="font-medium">{new Date(person.birthday).toLocaleDateString('fr-FR')}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center">
            <ShoppingBag className="w-4 h-4 mr-1" />
            Budget
          </span>
          <span className="font-bold text-primary">{formatBudget(person.budget)}</span>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Centres d'intérêt</h4>
          <div className="flex flex-wrap gap-2">
            {person.interests.slice(0, 4).map((interest, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {interest}
              </Badge>
            ))}
            {person.interests.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{person.interests.length - 4}
              </Badge>
            )}
          </div>
        </div>
        
        {person.lastGift && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Dernier cadeau</h4>
            <p className="text-xs text-foreground truncate">{person.lastGift}</p>
          </div>
        )}
        
        <div className="flex space-x-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 hover:bg-primary/10 transition-colors"
            onClick={onEdit}
          >
            <Edit className="w-3 h-3 mr-1" />
            Modifier
          </Button>
          <Button 
            size="sm" 
            className="flex-1 bg-gradient-primary text-white hover:shadow-glow transition-all duration-300"
            onClick={onViewProfile}
          >
            <User className="w-3 h-3 mr-1" />
            Voir profil
          </Button>
          {onDelete && (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-destructive hover:bg-destructive hover:text-white transition-colors"
              onClick={onDelete}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonProfile;