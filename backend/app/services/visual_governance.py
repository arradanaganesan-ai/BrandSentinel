import math
import re
from typing import Dict, Any, List, Tuple
from io import BytesIO
from PIL import Image

def hex_to_rgb(hex_code: str) -> Tuple[int, int, int]:
    hex_clean = hex_code.lstrip("#")
    if len(hex_clean) == 3:
        hex_clean = "".join([c * 2 for c in hex_clean])
    if len(hex_clean) != 6:
        return (0, 0, 0)
    return (int(hex_clean[0:2], 16), int(hex_clean[2:4], 16), int(hex_clean[4:6], 16))

def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}".upper()

def get_relative_luminance(rgb: Tuple[int, int, int]) -> float:
    """Calculate WCAG 2.1 relative luminance."""
    components = []
    for c in rgb:
        s = c / 255.0
        if s <= 0.03928:
            components.append(s / 12.92)
        else:
            components.append(math.pow((s + 0.055) / 1.055, 2.4))
    return 0.2126 * components[0] + 0.7152 * components[1] + 0.0722 * components[2]

def calculate_contrast_ratio(hex1: str, hex2: str) -> float:
    """Calculate contrast ratio between two hex colors."""
    rgb1 = hex_to_rgb(hex1)
    rgb2 = hex_to_rgb(hex2)
    l1 = get_relative_luminance(rgb1)
    l2 = get_relative_luminance(rgb2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    ratio = (lighter + 0.05) / (darker + 0.05)
    return round(ratio, 2)

def evaluate_wcag_contrast(fg_hex: str, bg_hex: str, text_size_pt: float = 14.0, is_bold: bool = False) -> Dict[str, Any]:
    ratio = calculate_contrast_ratio(fg_hex, bg_hex)
    is_large_text = (text_size_pt >= 18.0) or (is_bold and text_size_pt >= 14.0)

    # WCAG AA: 4.5:1 for normal text, 3:1 for large text
    passes_aa_normal = ratio >= 4.5
    passes_aa_large = ratio >= 3.0
    passes_aa = passes_aa_large if is_large_text else passes_aa_normal

    # WCAG AAA: 7:1 for normal text, 4.5:1 for large text
    passes_aaa_normal = ratio >= 7.0
    passes_aaa_large = ratio >= 4.5
    passes_aaa = passes_aaa_large if is_large_text else passes_aaa_normal

    if passes_aaa:
        eval_text = "Exceptional Contrast (Passes WCAG AAA)"
    elif passes_aa:
        eval_text = "Good Contrast (Passes WCAG AA standard)"
    else:
        eval_text = "Insufficient Contrast (Fails WCAG AA minimum 4.5:1)"

    return {
        "foreground": fg_hex,
        "background": bg_hex,
        "contrast_ratio": ratio,
        "is_large_text": is_large_text,
        "passes_wcag_aa_normal": passes_aa_normal,
        "passes_wcag_aa_large": passes_aa_large,
        "passes_wcag_aaa_normal": passes_aaa_normal,
        "passes_wcag_aaa_large": passes_aaa_large,
        "passes_current_threshold": passes_aa,
        "evaluation": eval_text
    }

def extract_dominant_colors_from_bytes(image_bytes: bytes, num_colors: int = 5) -> List[Dict[str, Any]]:
    """Extract dominant palette from image using Pillow."""
    try:
        image = Image.open(BytesIO(image_bytes))
        image = image.convert("RGB")
        image = image.resize((100, 100))  # downscale for fast analysis
        
        # Quantize to find dominant colors
        quantized = image.quantize(colors=num_colors)
        palette = quantized.getpalette()[:num_colors * 3]
        
        colors = []
        for i in range(0, len(palette), 3):
            r, g, b = palette[i], palette[i+1], palette[i+2]
            colors.append({
                "hex": rgb_to_hex(r, g, b),
                "rgb": [r, g, b]
            })
        return colors
    except Exception as e:
        return [{"hex": "#0F172A", "rgb": [15, 23, 42], "error": str(e)}]

def match_palette_against_brand(extracted_hexes: List[str], brand_palette: List[str]) -> List[Dict[str, Any]]:
    """Check how close extracted image colors are to approved brand colors."""
    matches = []
    for ext in extracted_hexes:
        r1, g1, b1 = hex_to_rgb(ext)
        best_diff = 999999
        closest_brand = brand_palette[0] if brand_palette else "#000000"
        
        for br in brand_palette:
            r2, g2, b2 = hex_to_rgb(br)
            diff = math.sqrt((r1 - r2)**2 + (g1 - g2)**2 + (b1 - b2)**2)
            if diff < best_diff:
                best_diff = diff
                closest_brand = br
                
        is_close = best_diff < 50.0  # approximate Euclidean color distance threshold
        matches.append({
            "detected_color": ext,
            "closest_brand_color": closest_brand,
            "euclidean_distance": round(best_diff, 1),
            "is_on_brand": is_close,
            "status": "APPROVED_PALETTE_MATCH" if is_close else "OFF_PALETTE_CAUTION"
        })
    return matches
