import torch
import torch.nn as nn
from typing import Dict
import torchvision.models as models


class VisionBackbone(nn.Module):
    """
    Visual encoder using pre-trained backbones (e.g. ResNet).
    """

    def __init__(self, model_name: str = "resnet18", pretrained: bool = True, freeze: bool = True):
        super().__init__()
        self.model_name = model_name

        # Load Backbone
        if model_name == "resnet18":
            # Use weights=None/Default instead of pretrained=True for newer torchvision
            weights = models.ResNet18_Weights.DEFAULT if pretrained else None
            resnet = models.resnet18(weights=weights)
            # Remove FC head to get embeddings
            # ResNet: input -> conv1 -> bn1 -> relu -> maxpool -> layer1..4 -> avgpool -> fc
            # We want output of layer4 or avgpool
            self.backbone = nn.Sequential(*list(resnet.children())[:-1])  # Output: [B, 512, 1, 1]
            self.feature_dim = 512
        else:
            raise NotImplementedError(f"Model {model_name} not supported yet.")

        if freeze:
            for param in self.backbone.parameters():
                param.requires_grad = False

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: [B, C, H, W] image tensor
        Returns:
            embedding: [B, FeatureDim]
        """
        features = self.backbone(x)
        return features.flatten(1)


class MultimodalEncoder(nn.Module):
    """
    Fuses Proprioception + Vision + Force.
    """

    def __init__(
        self,
        vision_backbone: VisionBackbone,
        proprio_dim: int = 7,
        force_dim: int = 6,
        fusion_dim: int = 256,
    ):
        super().__init__()
        self.vision_backbone = vision_backbone

        # Encoders
        self.proprio_enc = nn.Sequential(nn.Linear(proprio_dim, 128), nn.ReLU(), nn.Linear(128, 64))

        self.force_enc = nn.Sequential(nn.Linear(force_dim, 64), nn.ReLU(), nn.Linear(64, 32))

        # Fusion
        # Input dim = vision_dim + proprio_emb + force_emb
        fusion_input_dim = self.vision_backbone.feature_dim + 64 + 32

        self.fusion = nn.Sequential(
            nn.Linear(fusion_input_dim, fusion_dim),
            nn.LayerNorm(fusion_dim),
            nn.ReLU(),
            nn.Linear(fusion_dim, fusion_dim),
        )

        self.dropout = nn.Dropout(0.1)

    def forward(self, obs_dict: Dict[str, torch.Tensor]) -> torch.Tensor:
        """
        Expects keys: 'vision', 'proprio', 'force'
        Handles missing keys via zero-padding (basic modality dropout at inference if needed).
        """
        # Vision
        if "vision" in obs_dict:
            vis_emb = self.vision_backbone(obs_dict["vision"])
        else:
            # Fallback/Error depending on reqs. Here assuming robustness check handles zeros external
            # But let's create zeros if missing for robustness
            batch_size = obs_dict.get("proprio", torch.zeros(1)).shape[0]
            vis_emb = torch.zeros(
                batch_size, self.vision_backbone.feature_dim, device=next(self.parameters()).device
            )

        # Proprio
        prop_emb = self.proprio_enc(obs_dict["proprio"])

        # Force
        if "force" in obs_dict:
            force_emb = self.force_enc(obs_dict["force"])
        else:
            batch_size = prop_emb.shape[0]
            force_emb = torch.zeros(batch_size, 32, device=prop_emb.device)

        # Concat
        fused = torch.cat([vis_emb, prop_emb, force_emb], dim=1)
        return self.fusion(fused)
