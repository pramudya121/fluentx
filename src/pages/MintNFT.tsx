import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, Sparkles } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Context';
import { mintNFT } from '@/lib/web3/contracts';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function MintNFT() {
  const { account } = useWeb3();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minting, setMinting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleMint = async () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!file || !name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setMinting(true);
    try {
      toast.info('Uploading file to storage...');
      const { tokenId } = await mintNFT(file, name, description, account);
      
      toast.success(`NFT minted successfully! Token ID: ${tokenId}`);
      
      // Reset form
      setFile(null);
      setPreview(null);
      setName('');
      setDescription('');
      
      // Navigate to profile
      setTimeout(() => {
        navigate('/profile');
      }, 2000);
    } catch (error: any) {
      console.error('Error minting NFT:', error);
      toast.error(error.message || 'Failed to mint NFT');
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="min-h-screen py-8 animate-fade-in">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Mint Your NFT
          </h1>
          <p className="text-muted-foreground text-lg">
            Create and mint your unique Sakura NFT
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Preview */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>How your NFT will appear</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/20">
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-8">
                    <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Upload an image to see preview</p>
                  </div>
                )}
              </div>
              {preview && (
                <div className="mt-4 p-4 rounded-lg bg-muted/30">
                  <h3 className="font-bold text-lg mb-1">{name || 'Untitled'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {description || 'No description'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>NFT Details</CardTitle>
              <CardDescription>Fill in your NFT information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file">Image File *</Label>
                <div className="relative">
                  <Input
                    id="file"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                    disabled={minting}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG, GIF, WEBP (Max 10MB)
                </p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="My Awesome NFT"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={minting}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your NFT..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  disabled={minting}
                />
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-semibold text-sm mb-2 text-primary">What happens next?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Image will be uploaded to secure storage</li>
                  <li>• Metadata will be created</li>
                  <li>• NFT will be minted to your wallet</li>
                  <li>• Transaction must be confirmed in wallet</li>
                </ul>
              </div>

              {/* Mint Button */}
              <Button
                onClick={handleMint}
                disabled={!account || !file || !name || minting}
                className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 h-12 text-lg font-semibold"
              >
                {minting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Minting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Mint NFT
                  </>
                )}
              </Button>

              {!account && (
                <p className="text-sm text-center text-destructive">
                  Please connect your wallet to mint NFTs
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
