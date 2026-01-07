import torch
from arcs.perception.vision import VisionBackbone, MultimodalEncoder


def test_vision_encoder_loading():
    """Encoder loads and produces correct embedding shape"""
    # Use pretrained=False for speed/offline safety in tests
    # Note: Our implementation defaults effectively to weights=None if pretrained=False
    encoder = VisionBackbone("resnet18", pretrained=False)

    # Create fake image [B=1, C=3, H=224, W=224]
    img = torch.randn(1, 3, 224, 224)
    emb = encoder(img)

    # ResNet18 feature dim is 512
    assert emb.shape == (1, 512)


def test_vision_backbone_freeze():
    """Ensure backbone parameters are frozen"""
    encoder = VisionBackbone("resnet18", pretrained=False, freeze=True)
    for param in encoder.backbone.parameters():
        assert not param.requires_grad


def test_multimodal_fusion_robustness():
    """Fusion handles missing modalities (dropout simulated)"""
    vision_backbone = VisionBackbone("resnet18", pretrained=False)
    model = MultimodalEncoder(vision_backbone, proprio_dim=7, force_dim=6)

    # Data
    v = torch.randn(2, 3, 224, 224)
    p = torch.randn(2, 7)
    f = torch.randn(2, 6)

    # 1. Complete input
    out_full = model({"vision": v, "proprio": p, "force": f})
    assert out_full.shape == (2, 256)  # Fusion dim default

    # 2. Missing vision (simulate occlusion/dropout by not providing key)
    # The model should handle sparse keys
    out_blind = model({"proprio": p, "force": f})
    assert out_blind.shape == (2, 256)

    # 3. Missing force
    out_noforce = model({"vision": v, "proprio": p})
    assert out_noforce.shape == (2, 256)

    # Outputs should vary (unless model learned to ignore vision, which raw init won't)
    # We just check runnability and shape here
    assert out_full.isfinite().all()
    assert out_blind.isfinite().all()
