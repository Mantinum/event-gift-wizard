import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { 
  User, 
  Heart, 
  ShoppingBag, 
  Calendar as CalendarIcon, 
  Mail, 
  Phone, 
  StickyNote,
  Gift,
  MapPin,
  Users
} from 'lucide-react';
import { Person } from '@/types';

interface PersonProfileViewModalProps {
  person: Person | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const PersonProfileViewModal = ({ 
  person, 
  isOpen, 
  onOpenChange 
}: PersonProfileViewModalProps) => {
  if (!person) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const calculateAge = (birthday: string) => {
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-2xl">
            <User className="h-6 w-6 text-primary" />
            <span>Profil de {person.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar et informations principales */}
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-6 mb-6">
                <Avatar className="w-24 h-24 border-4 border-gradient-primary shadow-glow">
                  <AvatarImage src={person.avatar} alt={person.name} />
                  <AvatarFallback className="bg-gradient-primary text-white text-2xl font-bold">
                    {getInitials(person.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-foreground mb-2">{person.name}</h2>
                  <Badge variant="secondary" className="mb-3">
                    <Heart className="w-4 h-4 mr-2" />
                    {person.relationship}
                  </Badge>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      <span>{calculateAge(person.birthday)} ans</span>
                    </div>
                    <div className="flex items-center text-primary font-medium">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      <span>Budget: {formatBudget(person.budget)}</span>
                    </div>
                    {person.gender && (
                      <div className="flex items-center text-muted-foreground">
                        <Users className="w-4 h-4 mr-2" />
                        <span>{person.gender}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground flex items-center mb-1">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Anniversaire
                  </span>
                  <span className="font-medium">
                    {new Date(person.birthday).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Centres d'intérêt */}
          <Card className="shadow-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <Gift className="w-5 h-5 mr-2 text-primary" />
                Centres d'intérêt
              </h3>
              <div className="flex flex-wrap gap-2">
                {person.interests.length > 0 ? (
                  person.interests.map((interest, index) => (
                    <Badge key={index} variant="outline" className="text-sm py-1 px-3">
                      {interest}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground italic">Aucun centre d'intérêt renseigné</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact et adresse */}
          {(person.email || person.phone || person.address) && (
            <Card className="shadow-card">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Contact & Localisation</h3>
                <div className="space-y-3">
                  {person.email && (
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-3 text-muted-foreground" />
                      <span className="text-sm">{person.email}</span>
                    </div>
                  )}
                  {person.phone && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-3 text-muted-foreground" />
                      <span className="text-sm">{person.phone}</span>
                    </div>
                  )}
                  {person.address && (
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 mr-3 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{person.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes personnelles */}
          {person.notes && (
            <Card className="shadow-card">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <StickyNote className="w-5 h-5 mr-2 text-primary" />
                  Notes personnelles
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {person.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Dernier cadeau */}
          {person.lastGift && (
            <Card className="shadow-card">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <Gift className="w-5 h-5 mr-2 text-primary" />
                  Dernier cadeau offert
                </h3>
                <p className="text-sm text-muted-foreground">
                  {person.lastGift}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonProfileViewModal;