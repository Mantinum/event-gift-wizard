import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Quote, RefreshCw } from "lucide-react";
import { useState } from "react";

const inspirationalQuotes = [
  {
    text: "Le meilleur cadeau que vous puissiez offrir à quelqu'un est votre attention.",
    author: "Jim Rohn"
  },
  {
    text: "Il n'y a pas de plus grand plaisir que de faire plaisir à quelqu'un.",
    author: "Jean de La Bruyère"
  },
  {
    text: "Ce n'est pas ce que vous donnez, mais l'amour avec lequel vous le donnez.",
    author: "Mère Teresa"
  },
  {
    text: "Un cadeau parfait, c'est celui qui montre que vous connaissez la personne.",
    author: "Anonyme"
  },
  {
    text: "Les petites attentions font les grands bonheurs.",
    author: "Proverbe français"
  },
  {
    text: "Donner est un plaisir plus durable que recevoir.",
    author: "Paul Valéry"
  },
  {
    text: "Le cadeau le plus précieux que vous puissiez faire à quelqu'un est votre temps.",
    author: "Rick Warren"
  }
];

export function QuoteWidget() {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(() => 
    Math.floor(Math.random() * inspirationalQuotes.length)
  );

  const getNewQuote = () => {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * inspirationalQuotes.length);
    } while (newIndex === currentQuoteIndex);
    setCurrentQuoteIndex(newIndex);
  };

  const currentQuote = inspirationalQuotes[currentQuoteIndex];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Quote className="h-5 w-5" />
            <span>Citation du Jour</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={getNewQuote}
            className="hover:rotate-180 transition-transform duration-500"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Quote className="absolute -top-1 -left-1 h-8 w-8 text-primary/20" />
            <blockquote className="pl-6 text-lg font-medium leading-relaxed italic">
              "{currentQuote.text}"
            </blockquote>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              — {currentQuote.author}
            </p>
          </div>
          
          <div className="flex items-center justify-center pt-4 border-t">
            <div className="flex space-x-2">
              {inspirationalQuotes.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuoteIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentQuoteIndex
                      ? 'bg-primary'
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                  aria-label={`Citation ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}