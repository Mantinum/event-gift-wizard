import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { usePersonalNoteGeneration } from '@/hooks/usePersonalNoteGeneration';
import { 
  Plus, 
  X, 
  Calendar as CalendarIcon, 
  User, 
  Save,
  Sparkles,
  Euro,
  Wand2,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Person, RELATIONSHIP_TYPES, INTEREST_CATEGORIES, GENDER_OPTIONS } from '@/types';
import { cn } from '@/lib/utils';

interface PersonProfileModalProps {
  person?: Person;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (person: Person) => void;
  trigger?: React.ReactNode;
}

const PersonProfileModal = ({ 
  person, 
  isOpen, 
  onOpenChange, 
  onSave, 
  trigger 
}: PersonProfileModalProps) => {
  const [formData, setFormData] = useState<Partial<Person>>({
    name: '',
    relationship: '',
    birthday: '',
    budget: 50,
    interests: [],
    preferredCategories: [],
    notes: '',
    email: '',
    phone: '',
    avatar: '',
    gender: '',
    address: ''
  });

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const { isGenerating, generatePersonalNote } = usePersonalNoteGeneration();

  // Réinitialiser le formulaire quand la personne change
  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name || '',
        relationship: person.relationship || '',
        birthday: person.birthday || '',
        budget: person.budget || 50,
        interests: person.interests || [],
        preferredCategories: person.preferredCategories || [],
        notes: person.notes || '',
        email: person.email || '',
        phone: person.phone || '',
        avatar: person.avatar || '',
        gender: person.gender || '',
        address: person.address || ''
      });
      setSelectedInterests(person.interests || []);
    } else {
      // Réinitialiser pour un nouveau profil
      setFormData({
        name: '',
        relationship: '',
        birthday: '',
        budget: 50,
        interests: [],
        preferredCategories: [],
        notes: '',
        email: '',
        phone: '',
        avatar: '',
        gender: '',
        address: ''
      });
      setSelectedInterests([]);
    }
  }, [person, isOpen]);

  const handleSave = () => {
    if (!formData.name || !formData.relationship || !formData.birthday) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    const personData: Person = {
      id: person?.id || '', // Laisser vide pour les nouveaux profils afin que Supabase génère l'UUID
      name: formData.name,
      relationship: formData.relationship,
      birthday: formData.birthday,
      budget: formData.budget || 50,
      interests: selectedInterests,
      preferredCategories: formData.preferredCategories || [],
      notes: formData.notes,
      email: formData.email,
      phone: formData.phone,
      avatar: formData.avatar,
      gender: formData.gender,
      address: formData.address,
    };

    onSave(personData);
    onOpenChange(false);
    
    toast({
      title: person ? "Profil modifié" : "Profil créé",
      description: `Le profil de ${personData.name} a été ${person ? 'modifié' : 'créé'} avec succès${personData.birthday ? ' - Événement anniversaire ajouté automatiquement !' : ''}`,
    });
  };

  const addInterest = (interest: string) => {
    if (interest && !selectedInterests.includes(interest)) {
      setSelectedInterests([...selectedInterests, interest]);
    }
    setNewInterest('');
  };

  const removeInterest = (interest: string) => {
    setSelectedInterests(selectedInterests.filter(i => i !== interest));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleGenerateNote = async () => {
    if (!formData.name || !formData.relationship) {
      toast({
        title: "Information manquante",
        description: "Veuillez renseigner au moins le nom et la relation",
        variant: "destructive",
      });
      return;
    }

    const age = formData.birthday ? new Date().getFullYear() - new Date(formData.birthday).getFullYear() : undefined;
    
    const note = await generatePersonalNote({
      name: formData.name,
      gender: formData.gender,
      age,
      relationship: formData.relationship,
      interests: selectedInterests
    });

    if (note) {
      setFormData({ ...formData, notes: note });
      toast({
        title: "Note générée",
        description: "La note personnelle a été générée avec succès",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            <span>{person ? 'Modifier le profil' : 'Nouveau profil'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar et nom */}
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4 mb-4">
                <Avatar className="w-16 h-16 border-4 border-gradient-primary">
                  <AvatarImage src={formData.avatar} alt={formData.name} />
                  <AvatarFallback className="bg-gradient-primary text-white text-lg font-bold">
                    {formData.name ? getInitials(formData.name) : <User className="h-6 w-6" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Nom complet *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Sophie Martin"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="relationship" className="text-sm font-medium">
                    Relation *
                  </Label>
                  <Select value={formData.relationship} onValueChange={(value) => setFormData({ ...formData, relationship: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choisir une relation" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gender" className="text-sm font-medium">
                    Sexe
                  </Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choisir le sexe" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="birthday" className="text-sm font-medium">Date de naissance *</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Budget */}
          <Card className="shadow-card">
            <CardContent className="p-4">
              <Label htmlFor="budget" className="text-sm font-medium flex items-center space-x-2">
                <Euro className="h-4 w-4 text-success" />
                <span>Budget moyen par cadeau</span>
              </Label>
              <div className="mt-2 flex items-center space-x-4">
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                  className="w-32"
                  min="5"
                  max="1000"
                />
                <span className="text-sm text-muted-foreground">€</span>
                <div className="flex-1 bg-gradient-primary/10 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">
                    Ce budget sera utilisé pour les suggestions automatiques
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Centres d'intérêt */}
          <Card className="shadow-card">
            <CardContent className="p-4">
              <Label className="text-sm font-medium">Centres d'intérêt</Label>
              
              <div className="mt-2 flex flex-wrap gap-2 mb-4">
                {selectedInterests.map((interest) => (
                  <Badge 
                    key={interest} 
                    variant="secondary" 
                    className="animate-bounce-in cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    onClick={() => removeInterest(interest)}
                  >
                    {interest}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>

              <div className="flex space-x-2 mb-3">
                <Input
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="Ajouter un centre d'intérêt"
                  onKeyPress={(e) => e.key === 'Enter' && addInterest(newInterest)}
                />
                <Button 
                  onClick={() => addInterest(newInterest)}
                  size="sm"
                  className="bg-gradient-primary text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {INTEREST_CATEGORIES.filter(cat => !selectedInterests.includes(cat)).map((category) => (
                  <Button
                    key={category}
                    variant="outline"
                    size="sm"
                    onClick={() => addInterest(category)}
                    className="text-xs hover:bg-primary/10 transition-colors"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact et adresse */}
          <Card className="shadow-card">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemple.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium">Téléphone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+33 6 12 34 56 78"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="address" className="text-sm font-medium">Adresse complète</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Rue de la Paix, 75001 Paris, France"
                  className="mt-1 min-h-[60px]"
                  rows={2}
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="notes" className="text-sm font-medium">Notes personnelles</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateNote}
                    disabled={isGenerating || !formData.name || !formData.relationship}
                    className="text-xs hover:bg-primary/10"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3 h-3 mr-1" />
                        Générer automatiquement
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Décrivez cette personne: ses goûts, sa personnalité, ses préférences... ou cliquez sur 'Générer automatiquement'"
                  className="mt-1 min-h-[80px]"
                />
                {formData.notes && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ces informations aideront l'IA à proposer des cadeaux plus personnalisés
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-gradient-primary text-white shadow-elegant hover:shadow-glow transition-all duration-300"
          >
            <Save className="mr-2 h-4 w-4" />
            {person ? 'Modifier' : 'Créer le profil'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonProfileModal;