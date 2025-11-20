import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Context';
import { mintNFT } from '@/lib/web3/contracts';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getProvider, switchToFluentTestnet, setupChainChangeListener } from '@/lib/web3/wallet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function MintNFT() {
  const { account } = useWeb3();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minting, setMinting] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'checking' | 'correct' | 'wrong' | 'no-wallet'>('checking');

  // Check network on mount and when account changes
  useEffect(() => {
    const checkNetwork = async () => {
      if (!account) {
        setNetworkStatus('no-wallet');
        return;
      }

      try {
        const provider = await getProvider();
        if (!provider) {
          setNetworkStatus('no-wallet');
          return;
        }

        const network = await provider.getNetwork();
        // Handle both BigInt and number for chainId
        const chainId = typeof network.chainId === 'bigint' 
          ? Number(network.chainId) 
          : network.chainId;
        
        console.log('Current Chain ID:', chainId, 'Expected: 20994');
        
        if (chainId === 20994) {
          setNetworkStatus('correct');
        } else {
          setNetworkStatus('wrong');
        }
      } catch (error) {
        console.error('Error checking network:', error);
        setNetworkStatus('wrong');
      }
    };

    checkNetwork();

    // Listen for chain changes
    const cleanup = setupChainChangeListener(() => {
      console.log('Chain changed, rechecking network...');
      checkNetwork();
    });

    return cleanup;
  }, [account]);

  const handleSwitchNetwork = async () => {
    try {
      await switchToFluentTestnet();
      
      // Wait a bit for the network to switch, then recheck
      setTimeout(async () => {
        const provider = await getProvider();
        if (provider) {
          const network = await provider.getNetwork();
          const chainId = typeof network.chainId === 'bigint' 
            ? Number(network.chainId) 
            : network.chainId;
          
          console.log('After switch - Chain ID:', chainId);
          
          if (chainId === 20994) {
            setNetworkStatus('correct');
            toast.success('Successfully switched to Fluent Testnet');
          } else {
            toast.error('Please manually switch to Fluent Testnet in your wallet');
          }
        }
      }, 500);
    } catch (error: any) {
      console.error('Error switching network:', error);
      toast.error(error.message || 'Failed to switch network');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (selectedFile.size > maxSize) {
        toast.error('Image size must be less than 10MB');
        return;
      }

      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      toast.success('Image loaded successfully');
    }
  };

  const handleMint = async () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (networkStatus !== 'correct') {
      toast.error('Please switch to Fluent Testnet first');
      return;
    }

    if (!file) {
      toast.error('Please upload an image');
      return;
    }

    if (!name || name.trim().length === 0) {
      toast.error('Please enter a name for your NFT');
      return;
    }

    if (name.trim().length > 100) {
      toast.error('NFT name must be less than 100 characters');
      return;
    }

    if (description && description.trim().length > 500) {
      toast.error('Description must be less than 500 characters');
      return;
    }

    setMinting(true);
    let loadingToast: string | number | undefined;
    
    try {
      // Show different loading stages
      loadingToast = toast.loading('Uploading image to storage...');
      
      const { tokenId } = await mintNFT(file, name.trim(), description.trim(), account);
      
      toast.dismiss(loadingToast);
      toast.success(`NFT minted successfully! Token ID: ${tokenId}`, {
        duration: 5000,
      });

      // Reset form
      setFile(null);
      setPreview(null);
      setName('');
      setDescription('');

      // Navigate to profile after a short delay
      setTimeout(() => {
        navigate('/profile');
      }, 2000);
    } catch (error: any) {
      console.error('Error minting NFT:', error);
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
      
      // Show user-friendly error message
      const errorMessage = error.message || 'Failed to mint NFT. Please try again.';
      toast.error(errorMessage, {
        duration: 5000,
      });
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            Mint Your NFT
          </h1>
          <p className="text-muted-foreground">
            Create and mint your unique NFT on Fluent Testnet
          </p>
        </div>

        {/* Network Status Alert */}
        {networkStatus === 'wrong' && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Wrong Network</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Please switch to Fluent Testnet to mint NFTs</span>
              <Button 
                onClick={handleSwitchNetwork} 
                variant="outline" 
                size="sm"
                className="ml-4"
              >
                Switch Network
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {networkStatus === 'no-wallet' && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Wallet Not Connected</AlertTitle>
            <AlertDescription>
              Please connect your wallet to start minting NFTs
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Preview Card */}
          <Card className="backdrop-blur-sm bg-background/50 border-primary/20">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>How your NFT will look</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {preview ? (
                  <img src={preview} alt="NFT Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Upload className="w-16 h-16 mx-auto mb-2 opacity-50" />
                    <p>No image selected</p>
                  </div>
                )}
              </div>
              
              {preview && (
                <div className="mt-4 space-y-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-lg font-semibold">{name || 'Untitled NFT'}</p>
                  </div>
                  {description && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Description</p>
                      <p className="text-sm">{description}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mint Form */}
          <Card className="backdrop-blur-sm bg-background/50 border-primary/20">
            <CardHeader>
              <CardTitle>NFT Details</CardTitle>
              <CardDescription>Upload your artwork and add details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image">Image *</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={minting || networkStatus !== 'correct'}
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG, GIF, WebP (Max 10MB)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name * ({name.length}/100)</Label>
                <Input
                  id="name"
                  placeholder="Enter NFT name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={minting || networkStatus !== 'correct'}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description ({description.length}/500)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter NFT description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  disabled={minting || networkStatus !== 'correct'}
                  maxLength={500}
                />
              </div>

              <Button
                onClick={handleMint}
                disabled={!file || !name || minting || networkStatus !== 'correct'}
                className="w-full"
                size="lg"
              >
                {minting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Minting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Mint NFT
                  </>
                )}
              </Button>

              {!account && (
                <p className="text-sm text-center text-muted-foreground">
                  Please connect your wallet to continue
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <Card className="mt-8 backdrop-blur-sm bg-background/50 border-primary/20">
          <CardHeader>
            <CardTitle>How Minting Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Upload your artwork (image file)</li>
              <li>Add a name and description for your NFT</li>
              <li>Ensure you're connected to Fluent Testnet</li>
              <li>Click "Mint NFT" and confirm the transaction in your wallet</li>
              <li>Wait for the transaction to be confirmed on the blockchain</li>
              <li>Your NFT will appear in your profile once minted</li>
            </ol>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Note:</p>
              <p className="text-sm text-muted-foreground">
                Minting requires a small amount of ETH for gas fees. Make sure you have enough
                ETH in your wallet on Fluent Testnet.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
